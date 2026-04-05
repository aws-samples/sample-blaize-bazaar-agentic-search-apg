"""
Image Search Service - Multi-Modal Semantic Search
Uses Claude Sonnet 4.6 vision to analyze product images and find similar items.
"""
import logging
import json
import base64
from typing import Optional, Dict, List, Any
import boto3
from botocore.exceptions import ClientError

from config import settings

logger = logging.getLogger(__name__)


class ImageSearchService:
    """Service for multi-modal image-based product search"""
    
    def __init__(self):
        self.bedrock_client = boto3.client(
            service_name="bedrock-runtime",
            region_name=settings.AWS_REGION
        )
        # Claude Sonnet 4 supports vision
        self.vision_model = settings.BEDROCK_CHAT_MODEL
        logger.info(f"Initialized ImageSearchService with model: {self.vision_model}")
    
    async def analyze_image(
        self,
        image_data: bytes,
        mime_type: str = "image/jpeg"
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze product image using Claude Sonnet 4 vision
        
        Args:
            image_data: Raw image bytes
            mime_type: MIME type of the image (e.g., 'image/jpeg', 'image/png')
        
        Returns:
            Dictionary containing:
                - description: Detailed product description
                - category: Inferred product category
                - key_features: List of notable features
                - search_keywords: Keywords for semantic search
        """
        try:
            # Convert image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Prepare vision request
            system_prompt = """You are a product analysis expert for an e-commerce platform. 
Analyze product images to extract detailed, searchable information."""
            
            user_message = """Analyze this product image and provide:

1. A detailed description (2-3 sentences) focusing on what someone would search for
2. The most likely product category
3. Key features, materials, style, or characteristics
4. 5-7 search keywords that would help find similar products

Format your response as JSON:
{
  "description": "detailed description here",
  "category": "category name",
  "key_features": ["feature1", "feature2", ...],
  "search_keywords": ["keyword1", "keyword2", ...]
}

Focus on attributes like: type, color, style, material, brand indicators, use case, target audience."""

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "temperature": 0.3,  # Lower temperature for more consistent analysis
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime_type,
                                    "data": image_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": user_message
                            }
                        ]
                    }
                ]
            }
            
            # Invoke Claude Sonnet 4
            logger.info("📸 Analyzing image with Claude Sonnet 4 vision...")
            response = self.bedrock_client.invoke_model(
                modelId=self.vision_model,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json"
            )
            
            # Parse response
            response_body = json.loads(response["body"].read())
            
            if "content" in response_body:
                content_blocks = response_body["content"]
                for block in content_blocks:
                    if block.get("type") == "text":
                        text_response = block.get("text", "")
                        
                        # Extract JSON from response
                        # Claude might wrap it in markdown code blocks
                        if "```json" in text_response:
                            json_start = text_response.find("```json") + 7
                            json_end = text_response.find("```", json_start)
                            json_str = text_response[json_start:json_end].strip()
                        elif "```" in text_response:
                            json_start = text_response.find("```") + 3
                            json_end = text_response.find("```", json_start)
                            json_str = text_response[json_start:json_end].strip()
                        else:
                            json_str = text_response.strip()
                        
                        try:
                            analysis = json.loads(json_str)
                            logger.info(f"✅ Image analysis complete: {analysis.get('category', 'unknown')}")
                            return analysis
                        except json.JSONDecodeError:
                            logger.error("Failed to parse JSON from Claude response")
                            # Fallback: create structured response from text
                            return {
                                "description": text_response[:200],
                                "category": "General",
                                "key_features": [],
                                "search_keywords": []
                            }
            
            logger.error("No content in Claude vision response")
            return None
            
        except ClientError as e:
            logger.error(f"Bedrock API error during image analysis: {e}")
            return None
        except Exception as e:
            logger.error(f"Error analyzing image: {e}")
            return None
    
    def create_search_query(self, analysis: Dict[str, Any]) -> str:
        """
        Create optimized search query from image analysis
        
        Args:
            analysis: Image analysis results from analyze_image()
        
        Returns:
            Optimized search query string
        """
        # Combine description and keywords for comprehensive search
        query_parts = []
        
        if analysis.get("description"):
            query_parts.append(analysis["description"])
        
        if analysis.get("category"):
            query_parts.append(analysis["category"])
        
        if analysis.get("key_features"):
            query_parts.extend(analysis["key_features"][:3])  # Top 3 features
        
        # Create natural language query
        search_query = " ".join(query_parts)
        
        logger.info(f"🔍 Generated search query: {search_query[:100]}...")
        return search_query
    
    def format_analysis_for_display(self, analysis: Dict[str, Any]) -> str:
        """
        Format analysis results for user-friendly display
        
        Args:
            analysis: Image analysis results
        
        Returns:
            Formatted string for display
        """
        parts = []
        
        if analysis.get("description"):
            parts.append(f"**Product Analysis:** {analysis['description']}")
        
        if analysis.get("category"):
            parts.append(f"**Category:** {analysis['category']}")
        
        if analysis.get("key_features"):
            features = ", ".join(analysis["key_features"])
            parts.append(f"**Key Features:** {features}")
        
        return "\n\n".join(parts)


# For use as a dependency in FastAPI
_image_search_service: Optional[ImageSearchService] = None


def get_image_search_service() -> ImageSearchService:
    """Dependency injection for ImageSearchService"""
    global _image_search_service
    if _image_search_service is None:
        _image_search_service = ImageSearchService()
    return _image_search_service
