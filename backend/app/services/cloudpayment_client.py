"""CloudPayment API Client with ENV-based configuration"""
import os
import hashlib
import hmac
import base64
from typing import Dict, Any, Optional
import httpx
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class CloudPaymentClient:
    """
    CloudPayment API client that automatically switches between mock and real payments.
    
    If CLOUDPAYMENT_PUBLIC_ID is not set in ENV, uses mock mode.
    If set, uses real CloudPayment API.
    """
    
    def __init__(self):
        self.public_id = os.getenv("CLOUDPAYMENT_PUBLIC_ID")
        self.api_secret = os.getenv("CLOUDPAYMENT_API_SECRET")
        self.is_mock = not self.public_id or not self.api_secret
        self.base_url = "https://api.cloudpayments.ru"  # Production API
        
        if self.is_mock:
            logger.info("💳 CloudPayment: Running in MOCK mode (no credentials in ENV)")
        else:
            logger.info(f"💳 CloudPayment: Running in REAL mode (Public ID: {self.public_id[:10]}...)")
    
    def is_mock_mode(self) -> bool:
        """Check if running in mock mode"""
        return self.is_mock
    
    async def create_widget_url(
        self,
        user_id: str,
        amount: float,
        currency: str = "RUB",
        description: str = "Premium Subscription",
        invoice_id: Optional[str] = None,
        email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create payment widget URL for user to pay.
        
        In mock mode: Returns fake URL
        In real mode: Returns CloudPayment widget URL
        """
        if self.is_mock:
            return self._create_mock_widget_url(user_id, amount, invoice_id)
        
        # Real CloudPayment widget URL
        # Widget displays payment form and handles card input
        invoice_id = invoice_id or f"INV-{user_id}-{int(datetime.utcnow().timestamp())}"
        
        # CloudPayment widget requires these parameters
        widget_url = f"https://widget.cloudpayments.ru/?"
        widget_url += f"publicId={self.public_id}"
        widget_url += f"&description={description}"
        widget_url += f"&amount={amount}"
        widget_url += f"&currency={currency}"
        widget_url += f"&invoiceId={invoice_id}"
        widget_url += f"&accountId={user_id}"
        
        if email:
            widget_url += f"&email={email}"
        
        return {
            "success": True,
            "widget_url": widget_url,
            "invoice_id": invoice_id,
            "is_mock": False
        }
    
    def _create_mock_widget_url(self, user_id: str, amount: float, invoice_id: Optional[str]) -> Dict[str, Any]:
        """Create mock payment URL for development"""
        invoice_id = invoice_id or f"MOCK-INV-{user_id}-{int(datetime.utcnow().timestamp())}"
        
        return {
            "success": True,
            "widget_url": f"https://mock-payment-provider.com/checkout/{invoice_id}",
            "invoice_id": invoice_id,
            "is_mock": True,
            "mock_info": {
                "message": "This is a MOCK payment. Set CLOUDPAYMENT_PUBLIC_ID in .env to use real payments",
                "amount": amount,
                "user_id": user_id
            }
        }
    
    async def charge_by_token(
        self,
        token: str,
        user_id: str,
        amount: float,
        currency: str = "RUB",
        description: str = "Recurring payment",
        invoice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Charge user by saved token (for recurring payments).
        
        In mock mode: Always succeeds
        In real mode: Calls CloudPayment API
        """
        if self.is_mock:
            return self._mock_charge_success(user_id, amount, invoice_id)
        
        # Real API call
        url = f"{self.base_url}/payments/tokens/charge"
        invoice_id = invoice_id or f"REC-{user_id}-{int(datetime.utcnow().timestamp())}"
        
        payload = {
            "Amount": amount,
            "Currency": currency,
            "AccountId": user_id,
            "Token": token,
            "Description": description,
            "InvoiceId": invoice_id
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    auth=(self.public_id, self.api_secret),
                    headers={"Content-Type": "application/json"}
                )
                
                result = response.json()
                
                if result.get("Success"):
                    return {
                        "success": True,
                        "transaction_id": result.get("Model", {}).get("TransactionId"),
                        "invoice_id": invoice_id,
                        "is_mock": False
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("Message", "Payment failed"),
                        "is_mock": False
                    }
        except Exception as e:
            logger.error(f"CloudPayment API error: {e}")
            return {
                "success": False,
                "error": str(e),
                "is_mock": False
            }
    
    def _mock_charge_success(self, user_id: str, amount: float, invoice_id: Optional[str]) -> Dict[str, Any]:
        """Mock successful charge for testing"""
        invoice_id = invoice_id or f"MOCK-REC-{user_id}-{int(datetime.utcnow().timestamp())}"
        
        return {
            "success": True,
            "transaction_id": f"MOCK-TXN-{int(datetime.utcnow().timestamp())}",
            "invoice_id": invoice_id,
            "is_mock": True,
            "mock_info": {
                "message": "This is a MOCK recurring payment",
                "amount": amount,
                "user_id": user_id
            }
        }
    
    def verify_webhook_signature(self, request_body: bytes, signature: str) -> bool:
        """
        Verify webhook signature from CloudPayment.
        
        In mock mode: Always returns True
        In real mode: Verifies HMAC signature
        """
        if self.is_mock:
            return True  # Skip verification in mock mode
        
        # Real signature verification
        # CloudPayment sends HMAC-SHA256 signature in base64
        expected_signature = base64.b64encode(
            hmac.new(
                self.api_secret.encode('utf-8'),
                request_body,
                hashlib.sha256
            ).digest()
        ).decode('utf-8')
        
        return hmac.compare_digest(signature, expected_signature)
    
    async def refund_payment(
        self,
        transaction_id: str,
        amount: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Refund a payment (full or partial).
        
        In mock mode: Always succeeds
        In real mode: Calls CloudPayment API
        """
        if self.is_mock:
            return {
                "success": True,
                "is_mock": True,
                "mock_info": {
                    "message": "Mock refund successful",
                    "transaction_id": transaction_id,
                    "amount": amount
                }
            }
        
        # Real API call
        url = f"{self.base_url}/payments/refund"
        
        payload = {
            "TransactionId": transaction_id
        }
        
        if amount:
            payload["Amount"] = amount
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    auth=(self.public_id, self.api_secret),
                    headers={"Content-Type": "application/json"}
                )
                
                result = response.json()
                
                return {
                    "success": result.get("Success", False),
                    "is_mock": False,
                    "error": result.get("Message") if not result.get("Success") else None
                }
        except Exception as e:
            logger.error(f"CloudPayment refund error: {e}")
            return {
                "success": False,
                "error": str(e),
                "is_mock": False
            }
    
    async def check_payment_status(self, transaction_id: str) -> Dict[str, Any]:
        """
        Check payment status by transaction ID.
        
        In mock mode: Returns mock status
        In real mode: Queries CloudPayment API
        """
        if self.is_mock:
            return {
                "success": True,
                "status": "Completed",
                "is_mock": True,
                "mock_info": {
                    "message": "Mock payment status",
                    "transaction_id": transaction_id
                }
            }
        
        # Real API call
        url = f"{self.base_url}/payments/get"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json={"TransactionId": transaction_id},
                    auth=(self.public_id, self.api_secret),
                    headers={"Content-Type": "application/json"}
                )
                
                result = response.json()
                
                if result.get("Success"):
                    model = result.get("Model", {})
                    return {
                        "success": True,
                        "status": model.get("Status"),
                        "amount": model.get("Amount"),
                        "currency": model.get("Currency"),
                        "is_mock": False
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("Message", "Failed to get status"),
                        "is_mock": False
                    }
        except Exception as e:
            logger.error(f"CloudPayment status check error: {e}")
            return {
                "success": False,
                "error": str(e),
                "is_mock": False
            }


# Global instance
cloudpayment_client = CloudPaymentClient()
