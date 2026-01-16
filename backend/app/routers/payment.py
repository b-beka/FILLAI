from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.db_models import User, PaymentTransaction
from app.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import os
import logging
import json
from app.services.cloudpayment_client import cloudpayment_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payment", tags=["payment"])

# Pricing configuration from ENV
PREMIUM_MONTHLY_PRICE = float(os.getenv("PREMIUM_MONTHLY_PRICE", "990"))  # RUB
PREMIUM_YEARLY_PRICE = float(os.getenv("PREMIUM_YEARLY_PRICE", "9900"))  # RUB


class CheckoutSessionRequest(BaseModel):
    plan: str = "monthly"  # monthly or yearly


class CheckoutSessionResponse(BaseModel):
    success: bool
    checkout_url: Optional[str] = None
    invoice_id: Optional[str] = None
    is_mock: bool = False
    error: Optional[str] = None


class WebhookPayload(BaseModel):
    """CloudPayment webhook payload"""
    TransactionId: Optional[str] = None
    InvoiceId: str
    Amount: float
    Currency: str = "RUB"
    Status: str
    AccountId: str  # user_id


class MockPaymentRequest(BaseModel):
    """For testing payments in mock mode"""
    invoice_id: str


@router.get("/info")
async def payment_info():
    """Get payment system information"""
    is_mock = cloudpayment_client.is_mock_mode()
    
    return {
        "mode": "mock" if is_mock else "production",
        "provider": "CloudPayments" if not is_mock else "Mock System",
        "pricing": {
            "monthly": PREMIUM_MONTHLY_PRICE,
            "yearly": PREMIUM_YEARLY_PRICE,
            "currency": "RUB"
        },
        "info": "Set CLOUDPAYMENT_PUBLIC_ID and CLOUDPAYMENT_API_SECRET in .env to enable real payments"
    }


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a payment checkout session.
    
    In MOCK mode: Returns mock payment URL
    In REAL mode: Returns CloudPayment widget URL
    """
    try:
        # Determine amount based on plan
        amount = PREMIUM_MONTHLY_PRICE if request.plan == "monthly" else PREMIUM_YEARLY_PRICE
        description = f"Fill AI Premium Subscription - {request.plan.capitalize()}"
        
        # Create widget URL (mock or real based on ENV)
        result = await cloudpayment_client.create_widget_url(
            user_id=str(current_user.id),
            amount=amount,
            currency="RUB",
            description=description,
            email=current_user.email
        )
        
        if not result.get("success"):
            return CheckoutSessionResponse(
                success=False,
                error="Failed to create payment session",
                is_mock=result.get("is_mock", False)
            )
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            user_id=current_user.id,
            invoice_id=result["invoice_id"],
            amount=amount,
            currency="RUB",
            description=description,
            status="pending",
            is_mock=result.get("is_mock", False),
            payment_method="card"
        )
        db.add(transaction)
        db.commit()
        
        logger.info(f"Created payment session for user {current_user.id}: {result['invoice_id']} (mock={result.get('is_mock')})")
        
        return CheckoutSessionResponse(
            success=True,
            checkout_url=result["widget_url"],
            invoice_id=result["invoice_id"],
            is_mock=result.get("is_mock", False)
        )
    
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        return CheckoutSessionResponse(
            success=False,
            error=str(e),
            is_mock=cloudpayment_client.is_mock_mode()
        )


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    db: Session = Depends(get_db),
    content_signature: Optional[str] = Header(None)
):
    """
    Handle CloudPayment webhooks.
    
    CloudPayment sends notifications for:
    - Pay: Payment succeeded
    - Confirm: 3D-Secure confirmed
    - Fail: Payment failed
    - Refund: Payment refunded
    """
    try:
        body = await request.body()
        
        # Verify signature (skipped in mock mode)
        if not cloudpayment_client.is_mock_mode():
            if not content_signature:
                raise HTTPException(status_code=400, detail="Missing signature")
            
            if not cloudpayment_client.verify_webhook_signature(body, content_signature):
                raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Parse webhook data
        data = await request.json()
        logger.info(f"Received payment webhook: {data}")
        
        invoice_id = data.get("InvoiceId")
        if not invoice_id:
            raise HTTPException(status_code=400, detail="Missing InvoiceId")
        
        # Find transaction
        transaction = db.query(PaymentTransaction).filter(
            PaymentTransaction.invoice_id == invoice_id
        ).first()
        
        if not transaction:
            logger.warning(f"Transaction not found for invoice: {invoice_id}")
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Update transaction based on status
        transaction_status = data.get("Status", "").lower()
        transaction.transaction_id = data.get("TransactionId")
        transaction.webhook_data = json.dumps(data)
        transaction.updated_at = datetime.utcnow()
        
        if transaction_status in ["completed", "authorized"]:
            # Payment succeeded
            transaction.status = "succeeded"
            transaction.completed_at = datetime.utcnow()
            
            # Upgrade user to premium
            user = db.query(User).filter(User.id == transaction.user_id).first()
            if user:
                user.subscription_plan = "premium"
                # Set expiration based on plan (monthly = 30 days, yearly = 365 days)
                # For now, set to None (unlimited)
                user.subscription_expires_at = None
                logger.info(f"Upgraded user {user.id} to premium")
        
        elif transaction_status == "declined":
            transaction.status = "failed"
            logger.info(f"Payment failed for invoice {invoice_id}")
        
        elif transaction_status == "refunded":
            transaction.status = "refunded"
            
            # Downgrade user to free
            user = db.query(User).filter(User.id == transaction.user_id).first()
            if user:
                user.subscription_plan = "free"
                user.subscription_expires_at = None
                logger.info(f"Downgraded user {user.id} to free (refund)")
        
        db.commit()
        
        return {"code": 0}  # CloudPayment expects {"code": 0} for success
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mock-success")
async def mock_payment_success(
    request: MockPaymentRequest,
    db: Session = Depends(get_db)
):
    """
    Mock endpoint to simulate successful payment.
    Only works in MOCK mode for testing.
    Frontend calls this when user "pays" in mock modal.
    """
    if not cloudpayment_client.is_mock_mode():
        raise HTTPException(
            status_code=400,
            detail="Mock payments are disabled. Use real CloudPayment integration."
        )
    
    # Find transaction
    transaction = db.query(PaymentTransaction).filter(
        PaymentTransaction.invoice_id == request.invoice_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction
    transaction.status = "succeeded"
    transaction.completed_at = datetime.utcnow()
    transaction.transaction_id = f"MOCK-TXN-{int(datetime.utcnow().timestamp())}"
    
    # Upgrade user to premium
    user = db.query(User).filter(User.id == transaction.user_id).first()
    if user:
        user.subscription_plan = "premium"
        user.subscription_expires_at = None
        logger.info(f"MOCK: Upgraded user {user.id} to premium")
    
    db.commit()
    
    return {
        "status": "success",
        "message": "User upgraded to Premium (MOCK)",
        "is_mock": True
    }


@router.get("/transactions")
async def get_user_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all payment transactions for current user"""
    transactions = db.query(PaymentTransaction).filter(
        PaymentTransaction.user_id == current_user.id
    ).order_by(PaymentTransaction.created_at.desc()).all()
    
    return {
        "transactions": [
            {
                "id": str(t.id),
                "invoice_id": t.invoice_id,
                "amount": t.amount,
                "currency": t.currency,
                "status": t.status,
                "is_mock": t.is_mock,
                "created_at": t.created_at.isoformat(),
                "completed_at": t.completed_at.isoformat() if t.completed_at else None
            }
            for t in transactions
        ]
    }
