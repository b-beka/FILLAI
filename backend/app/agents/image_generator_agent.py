"""Agent for generating images using OpenAI DALL-E 3"""
import os
from openai import AsyncOpenAI
from typing import Optional


class ImageGeneratorAgent:
    """Agent that generates educational images using DALL-E 3"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.enabled = os.getenv("ENABLE_IMAGE_GENERATION", "false").lower() == "true"
    
    async def generate_image(self, prompt: str, style: str = "educational") -> Optional[str]:
        """
        Generate an image based on the prompt.
        
        Args:
            prompt: Description of the image to generate
            style: Style hint (educational, diagram, realistic, etc.)
            
        Returns:
            URL of the generated image, or None if generation fails/disabled
        """
        if not self.enabled:
            print("Image generation is disabled. Set ENABLE_IMAGE_GENERATION=true to enable.")
            return None
        
        try:
            # Enhance prompt for educational context
            enhanced_prompt = f"""Create a professional, educational illustration for the following topic:
{prompt}

Style requirements:
- Clean, modern design
- {style} style
- Suitable for educational materials
- High quality, detailed
- No text overlays"""

            response = await self.client.images.generate(
                model="dall-e-3",
                prompt=enhanced_prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )
            
            if response.data and len(response.data) > 0:
                return response.data[0].url
            
            return None
            
        except Exception as e:
            print(f"Error generating image: {e}")
            return None
    
    async def generate_diagram(self, topic: str) -> Optional[str]:
        """Generate a diagram-style illustration for the topic"""
        prompt = f"Educational diagram explaining {topic}. Include labels, arrows, and clear visual hierarchy."
        return await self.generate_image(prompt, style="diagram")
    
    async def generate_concept_art(self, concept: str) -> Optional[str]:
        """Generate concept art for abstract topics"""
        prompt = f"Visual metaphor or concept art representing: {concept}. Abstract but meaningful."
        return await self.generate_image(prompt, style="conceptual")
