#!/usr/bin/env python3
"""
Crawl4AI Python wrapper for Node.js integration
Handles web crawling using the Crawl4AI library
"""

import sys
import json
import asyncio
import traceback
from typing import Dict, Any, Optional, List
from datetime import datetime
import base64
import os
from contextlib import redirect_stdout, redirect_stderr
import io

try:
    from crawl4ai import AsyncWebCrawler
    CRAWL4AI_AVAILABLE = True

    # Try to import optional features
    try:
        from crawl4ai.extraction_strategy import (
            LLMExtractionStrategy,
            CosineStrategy,
        )
        EXTRACTION_STRATEGIES_AVAILABLE = True
    except ImportError:
        EXTRACTION_STRATEGIES_AVAILABLE = False

    try:
        from crawl4ai.extraction_strategy import RegexExtractionStrategy
        REGEX_EXTRACTION_AVAILABLE = True
    except ImportError:
        REGEX_EXTRACTION_AVAILABLE = False

    try:
        from crawl4ai.chunking_strategy import RegexChunking
        REGEX_CHUNKING_AVAILABLE = True
    except ImportError:
        REGEX_CHUNKING_AVAILABLE = False

    try:
        from crawl4ai.content_filter import (
            BM25ContentFilter,
            PruningContentFilter
        )
        CONTENT_FILTERS_AVAILABLE = True
    except ImportError:
        CONTENT_FILTERS_AVAILABLE = False

except ImportError as e:
    CRAWL4AI_AVAILABLE = False
    IMPORT_ERROR = str(e)
    EXTRACTION_STRATEGIES_AVAILABLE = False
    REGEX_EXTRACTION_AVAILABLE = False
    REGEX_CHUNKING_AVAILABLE = False
    CONTENT_FILTERS_AVAILABLE = False


class Crawl4AIWrapper:
    """Wrapper for Crawl4AI functionality"""

    def __init__(self):
        self.crawler = None

    async def crawl(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute web crawling with Crawl4AI

        Args:
            config: Crawling configuration containing url, options, etc.

        Returns:
            Dictionary with crawling results
        """
        if not CRAWL4AI_AVAILABLE:
            return {
                "success": False,
                "error": f"Crawl4AI not available: {IMPORT_ERROR}",
                "mock": True
            }

        try:
            url = config.get("url")
            if not url:
                return {
                    "success": False,
                    "error": "URL is required"
                }

            # Extract crawler and crawl configurations
            crawler_config = config.get("crawler_config", {})
            crawl_config = config.get("crawl_config", {})

            # Create crawler instance with verbose disabled
            crawler_config['verbose'] = False
            crawler = AsyncWebCrawler(**crawler_config)

            # Prepare crawl parameters
            try:
                crawl_params = self._prepare_crawl_params(crawl_config)
            except Exception as e:
                error_msg = str(e)
                if "deprecated" in error_msg.lower() and "provider" in error_msg.lower():
                    # If there's a deprecation error with provider, retry without extraction strategy
                    crawl_config_no_strategy = {k: v for k, v in crawl_config.items() if k != "extraction_strategy"}
                    crawl_params = self._prepare_crawl_params(crawl_config_no_strategy)
                else:
                    raise

            # Execute crawl with output suppressed
            # Redirect stdout and stderr to suppress progress messages
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                try:
                    result = await crawler.arun(url, **crawl_params)
                except Exception as e:
                    # Check if it's a deprecated parameter error
                    error_msg = str(e)
                    if "deprecated" in error_msg.lower() and "provider" in error_msg.lower():
                        # Try without extraction strategy if it's a provider deprecation error
                        crawl_params_no_strategy = {k: v for k, v in crawl_params.items() if k != "extraction_strategy"}
                        result = await crawler.arun(url, **crawl_params_no_strategy)
                    else:
                        raise

                # Close crawler
                await crawler.close()

            # Process and return result
            return self._process_result(result, config)

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc()
            }

    def _prepare_crawl_params(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare crawl parameters from configuration"""
        params = {}

        # Basic parameters
        if "word_count_threshold" in config:
            params["word_count_threshold"] = config["word_count_threshold"]
        if "css_selector" in config:
            params["css_selector"] = config["css_selector"]
        if "screenshot" in config:
            params["screenshot"] = config["screenshot"]
        if "user_agent" in config:
            params["user_agent"] = config["user_agent"]
        if "headers" in config:
            params["headers"] = config["headers"]
        if "wait_for" in config:
            params["wait_for"] = config["wait_for"]
        if "page_timeout" in config:
            params["page_timeout"] = config["page_timeout"]
        if "delay_before_return_html" in config:
            params["delay_before_return_html"] = config["delay_before_return_html"]
        if "js_code" in config:
            params["js_code"] = config["js_code"]
        if "remove_overlay_elements" in config:
            params["remove_overlay_elements"] = config["remove_overlay_elements"]
        if "simulate_user" in config:
            params["simulate_user"] = config["simulate_user"]
        if "override_navigator" in config:
            params["override_navigator"] = config["override_navigator"]
        if "magic" in config:
            params["magic"] = config["magic"]
        if "session_id" in config:
            params["session_id"] = config["session_id"]
        if "cache_mode" in config:
            params["cache_mode"] = config["cache_mode"]
        if "excluded_tags" in config:
            params["excluded_tags"] = config["excluded_tags"]
        if "only_text" in config:
            params["only_text"] = config["only_text"]
        if "process_iframes" in config:
            params["process_iframes"] = config["process_iframes"]
        if "remove_forms" in config:
            params["remove_forms"] = config["remove_forms"]
        if "social_media_links" in config:
            params["social_media_links"] = config["social_media_links"]
        if "social_media_domains" in config:
            params["social_media_domains"] = config["social_media_domains"]

        # Extraction strategy
        if "extraction_strategy" in config and EXTRACTION_STRATEGIES_AVAILABLE:
            strategy_config = config["extraction_strategy"]
            strategy_type = strategy_config.get("type", "cosine")

            if strategy_type == "llm":
                # Try new LLMConfig format first, fall back to old format if it fails
                try:
                    from crawl4ai.models import LLMConfig
                    params["extraction_strategy"] = LLMExtractionStrategy(
                        llm_config=LLMConfig(
                            provider=strategy_config.get("provider", "openai"),
                            api_token=strategy_config.get("api_token")
                        ),
                        instruction=strategy_config.get("instruction", "Extract main content"),
                        schema=strategy_config.get("schema")
                    )
                except (ImportError, TypeError, AttributeError):
                    # Fallback to old format for older versions or if new format fails
                    try:
                        params["extraction_strategy"] = LLMExtractionStrategy(
                            provider=strategy_config.get("provider", "openai"),
                            api_token=strategy_config.get("api_token"),
                            instruction=strategy_config.get("instruction", "Extract main content"),
                            schema=strategy_config.get("schema")
                        )
                    except TypeError:
                        # If both fail, skip extraction strategy
                        pass
            elif strategy_type == "cosine":
                params["extraction_strategy"] = CosineStrategy(
                    semantic_filter=strategy_config.get("semantic_filter", ""),
                    word_count_threshold=strategy_config.get("word_count_threshold", 10),
                    max_dist=strategy_config.get("max_dist", 0.2),
                    linkage_method=strategy_config.get("linkage_method", "ward"),
                    top_k=strategy_config.get("top_k", 3)
                )
            elif strategy_type == "regex" and REGEX_EXTRACTION_AVAILABLE:
                params["extraction_strategy"] = RegexExtractionStrategy(
                    patterns=strategy_config.get("patterns", [])
                )

        # Chunking strategy
        if "chunking_strategy" in config and REGEX_CHUNKING_AVAILABLE:
            chunking_config = config["chunking_strategy"]
            chunking_type = chunking_config.get("type", "regex")

            if chunking_type == "regex":
                params["chunking_strategy"] = RegexChunking(
                    patterns=chunking_config.get("patterns", [r'\n\n'])
                )
            # Other chunking strategies not available in current version

        # Content filter
        if "content_filter" in config and CONTENT_FILTERS_AVAILABLE:
            filter_config = config["content_filter"]
            filter_type = filter_config.get("type", "bm25")

            if filter_type == "bm25":
                params["content_filter"] = BM25ContentFilter(
                    user_query=filter_config.get("user_query", ""),
                    bm25_threshold=filter_config.get("bm25_threshold", 1.0)
                )
            elif filter_type == "pruning":
                params["content_filter"] = PruningContentFilter(
                    threshold=filter_config.get("threshold", 0.48),
                    threshold_type=filter_config.get("threshold_type", "fixed"),
                    min_word_threshold=filter_config.get("min_word_threshold", 0)
                )

        return params

    def _process_result(self, result, config) -> Dict[str, Any]:
        """Process crawler result into JSON-serializable format"""
        try:
            # Extract the first result from CrawlResult collection
            first_result = result[0] if hasattr(result, '__getitem__') and len(result) > 0 else result

            processed = {
                "success": getattr(first_result, 'success', True),
                "url": getattr(first_result, 'url', ''),
                "html": getattr(first_result, 'html', ''),
                "cleaned_html": getattr(first_result, 'cleaned_html', ''),
                "markdown": getattr(first_result, 'markdown', ''),
                "extracted_content": getattr(first_result, 'extracted_content', ''),
                "fit_markdown": getattr(first_result, 'fit_markdown', ''),
                "fit_html": getattr(first_result, 'fit_html', ''),
                "metadata": {},
                "links": {"internal": [], "external": []},
                "images": [],
                "media": {"videos": [], "audios": []},
                "screenshot": None,
                "response_headers": getattr(first_result, 'response_headers', {}),
                "status_code": getattr(first_result, 'status_code', 200),
                "session_id": getattr(first_result, 'session_id', config.get('crawl_config', {}).get('session_id')),
                "error_message": getattr(first_result, 'error_message', None)
            }

            # Process metadata if available
            if hasattr(first_result, 'metadata') and first_result.metadata:
                metadata = first_result.metadata
                processed["metadata"] = {
                    "title": metadata.get("title", "") if isinstance(metadata, dict) else getattr(metadata, "title", ""),
                    "description": metadata.get("description", "") if isinstance(metadata, dict) else getattr(metadata, "description", ""),
                    "keywords": metadata.get("keywords", []) if isinstance(metadata, dict) else getattr(metadata, "keywords", []),
                    "author": metadata.get("author", "") if isinstance(metadata, dict) else getattr(metadata, "author", ""),
                    "language": metadata.get("language", "") if isinstance(metadata, dict) else getattr(metadata, "language", ""),
                }

            # Process links if available
            if hasattr(first_result, 'links') and first_result.links:
                links = first_result.links
                if isinstance(links, dict):
                    processed["links"]["internal"] = links.get("internal", [])
                    processed["links"]["external"] = links.get("external", [])
                elif isinstance(links, list):
                    # Simple list of links, categorize as external
                    processed["links"]["external"] = [str(link) for link in links]

            # Process images if available
            if hasattr(first_result, 'images') and first_result.images:
                images = first_result.images
                if isinstance(images, list):
                    processed["images"] = [
                        img.dict() if hasattr(img, 'dict') else str(img) for img in images
                    ]

            # Process media if available
            if hasattr(first_result, 'media') and first_result.media:
                media = first_result.media
                if isinstance(media, dict):
                    processed["media"]["videos"] = media.get("videos", [])
                    processed["media"]["audios"] = media.get("audios", [])

            # Handle screenshot if present
            if hasattr(first_result, 'screenshot') and first_result.screenshot:
                if isinstance(first_result.screenshot, bytes):
                    processed["screenshot"] = base64.b64encode(first_result.screenshot).decode('utf-8')
                else:
                    processed["screenshot"] = str(first_result.screenshot)

            return processed

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to process result: {str(e)}",
                "traceback": traceback.format_exc()
            }


async def main():
    """Main entry point for the wrapper"""
    try:
        if len(sys.argv) < 2:
            result = {
                "success": False,
                "error": "Configuration argument required"
            }
        else:
            # Parse configuration from command line argument
            config_json = sys.argv[1]
            config = json.loads(config_json)

            # Create wrapper and execute crawl
            wrapper = Crawl4AIWrapper()
            result = await wrapper.crawl(config)

        # Output result as JSON
        print(json.dumps(result, ensure_ascii=False, indent=None))

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=None))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())