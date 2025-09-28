#!/usr/bin/env python3
"""
DeepDoctection Python wrapper for Node.js integration
Handles document analysis using the DeepDoctection library
"""

import sys
import json
import traceback
import base64
import io
import tempfile
import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path
import requests
from contextlib import redirect_stdout, redirect_stderr

# Suppress DeepDoctection's verbose output
logging.getLogger('deepdoctection').setLevel(logging.ERROR)
logging.getLogger('dd').setLevel(logging.ERROR)
logging.getLogger('transformers').setLevel(logging.ERROR)
logging.getLogger('tensorflow').setLevel(logging.ERROR)
logging.getLogger('torch').setLevel(logging.ERROR)
logging.getLogger('doctr').setLevel(logging.ERROR)
logging.getLogger('weasyprint').setLevel(logging.ERROR)

# Disable all non-error output
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TRANSFORMERS_VERBOSITY'] = 'error'
os.environ['USE_TORCH'] = '1'  # Use torch backend
os.environ['USE_TF'] = '0'  # Disable TensorFlow

try:
    import deepdoctection as dd
    from deepdoctection.dataflow import DataFromList
    from deepdoctection.analyzer import get_dd_analyzer
    DEEPDOCTECTION_AVAILABLE = True

    # Try to import optional components
    try:
        from deepdoctection.pipe import ImageLayoutService, TextExtractionService
        from deepdoctection.extern import ObjectDetectionResult
        ADVANCED_FEATURES = True
    except ImportError:
        ADVANCED_FEATURES = False

except ImportError as e:
    DEEPDOCTECTION_AVAILABLE = False
    IMPORT_ERROR = str(e)
    ADVANCED_FEATURES = False

# Try to import OCR libraries
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

try:
    import layoutparser as lp
    LAYOUTPARSER_AVAILABLE = True
except ImportError:
    LAYOUTPARSER_AVAILABLE = False


class DeepDoctectionWrapper:
    """Wrapper for DeepDoctection document analysis functionality"""

    def __init__(self):
        self.analyzer = None

    def process_document(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process document with DeepDoctection

        Args:
            config: Processing configuration containing document URL, options, etc.

        Returns:
            Dictionary with analysis results
        """
        if not DEEPDOCTECTION_AVAILABLE:
            return self._get_fallback_result(config)

        try:
            # Get document URL and options
            document_url = config.get("document_url")
            options = config.get("options", {})

            if not document_url:
                return {
                    "success": False,
                    "error": "document_url is required"
                }

            # Download document if it's a URL
            document_path = self._download_document(document_url)

            # Try to create analyzer with specified configuration
            try:
                analyzer = self._create_analyzer(options)
            except (ModuleNotFoundError, ImportError) as e:
                # If analyzer creation fails due to missing dependencies, use fallback
                return self._get_fallback_result(config)

            # Process the document
            df = DataFromList([document_path])

            # Analyze document with output suppressed
            analysis_results = []
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                for page_num, page in enumerate(analyzer.analyze(dataset_dataflow=df)):
                    page_result = self._extract_page_info(page, page_num + 1, options)
                    analysis_results.append(page_result)

            # Clean up temporary file
            if document_path.startswith('/tmp/'):
                os.unlink(document_path)

            # Build final result
            return self._build_result(analysis_results, document_url, options)

        except Exception as e:
            return {
                "success": False,
                "error": f"DeepDoctection processing failed: {str(e)}",
                "traceback": traceback.format_exc()
            }

    def _get_fallback_result(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Return a basic result when DeepDoctection is not available"""
        document_url = config.get("document_url", "unknown")

        # Try basic text extraction with requests
        try:
            if document_url.startswith('http'):
                response = requests.get(document_url, timeout=10)
                content_type = response.headers.get('content-type', '')

                if 'text/html' in content_type:
                    # Simple HTML text extraction
                    from html.parser import HTMLParser

                    class TextExtractor(HTMLParser):
                        def __init__(self):
                            super().__init__()
                            self.text = []

                        def handle_data(self, data):
                            self.text.append(data.strip())

                    parser = TextExtractor()
                    parser.feed(response.text)
                    text = ' '.join([t for t in parser.text if t])

                    return {
                        "success": True,
                        "mock": True,
                        "document": {
                            "text": text[:1000],  # Limit text length
                            "pages": 1,
                            "format": "html"
                        },
                        "metadata": {
                            "title": "Document",
                            "analyzer": "fallback_html_parser"
                        },
                        "error": f"DeepDoctection not available: {IMPORT_ERROR if not DEEPDOCTECTION_AVAILABLE else 'Unknown'}"
                    }

        except Exception as e:
            pass

        # Default mock response
        return {
            "success": True,
            "mock": True,
            "document": {
                "text": f"Mock DeepDoctection result for: {document_url}",
                "pages": 1,
                "format": "unknown"
            },
            "metadata": {
                "title": "Mock Document Analysis",
                "analyzer": "mock"
            },
            "tables": [],
            "figures": [],
            "error": f"DeepDoctection not available: {IMPORT_ERROR if not DEEPDOCTECTION_AVAILABLE else 'Unknown'}"
        }

    def _download_document(self, url: str) -> str:
        """Download document from URL and save to temporary file"""
        if not url.startswith('http'):
            # Assume it's already a local file path
            return url

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Determine file extension from URL or content type
        ext = '.pdf'  # Default
        if '.pdf' in url.lower():
            ext = '.pdf'
        elif '.png' in url.lower():
            ext = '.png'
        elif '.jpg' in url.lower() or '.jpeg' in url.lower():
            ext = '.jpg'
        elif '.tiff' in url.lower() or '.tif' in url.lower():
            ext = '.tiff'

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(response.content)
            return tmp.name

    def _create_analyzer(self, options: Dict[str, Any]) -> Any:
        """Create DeepDoctection analyzer with specified options"""
        # Get configuration
        analyzer_type = options.get("analyzer_type", "auto")
        ocr_enabled = options.get("ocr", False)  # Disable OCR by default due to compatibility
        table_detection = options.get("table_detection", True)
        layout_detection = options.get("layout_detection", True)

        # Suppress output during analyzer creation
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            try:
                # Try to create analyzer with custom config
                config_overwrite = {
                    "USE_LAYOUT": layout_detection,
                    "USE_TABLE_SEGMENTATION": table_detection,
                    "USE_OCR": False,  # Disable OCR to avoid doctr issues
                    "USE_PDF_TEXT": True,  # Use PDF text extraction instead
                }

                # Create analyzer without OCR to avoid compatibility issues
                analyzer = dd.get_dd_analyzer(config_overwrite=config_overwrite)
            except Exception as e:
                # Fallback to minimal analyzer
                try:
                    analyzer = dd.get_dd_analyzer(config_overwrite={"USE_OCR": False})
                except:
                    # Last resort - return None and handle in caller
                    return None

        return analyzer

    def _extract_page_info(self, page: Any, page_num: int, options: Dict[str, Any]) -> Dict[str, Any]:
        """Extract information from a single page"""
        page_info = {
            "page_number": page_num,
            "text": "",
            "tables": [],
            "figures": [],
            "layout_elements": []
        }

        try:
            # Extract text
            if hasattr(page, 'text'):
                page_info["text"] = str(page.text)

            # Extract tables
            if hasattr(page, 'tables'):
                for table in page.tables:
                    table_data = {
                        "rows": [],
                        "columns": getattr(table, 'column_count', 0),
                        "bbox": getattr(table, 'bbox', None)
                    }
                    if hasattr(table, 'cells'):
                        for cell in table.cells:
                            table_data["rows"].append({
                                "text": getattr(cell, 'text', ''),
                                "row": getattr(cell, 'row_idx', 0),
                                "col": getattr(cell, 'col_idx', 0)
                            })
                    page_info["tables"].append(table_data)

            # Extract figures/images
            if hasattr(page, 'images'):
                for img in page.images:
                    page_info["figures"].append({
                        "caption": getattr(img, 'caption', ''),
                        "bbox": getattr(img, 'bbox', None)
                    })

            # Extract layout elements
            if hasattr(page, 'layouts'):
                for layout in page.layouts:
                    page_info["layout_elements"].append({
                        "type": getattr(layout, 'category_name', 'unknown'),
                        "text": getattr(layout, 'text', ''),
                        "bbox": getattr(layout, 'bbox', None)
                    })

        except Exception as e:
            page_info["error"] = str(e)

        return page_info

    def _build_result(self, analysis_results: List[Dict[str, Any]],
                     document_url: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Build final result from analysis"""
        # Combine text from all pages
        full_text = "\n\n".join([
            page.get("text", "") for page in analysis_results
        ])

        # Collect all tables and figures
        all_tables = []
        all_figures = []
        for page in analysis_results:
            all_tables.extend(page.get("tables", []))
            all_figures.extend(page.get("figures", []))

        # Build markdown representation
        markdown = self._build_markdown(analysis_results)

        return {
            "success": True,
            "document": {
                "text": full_text,
                "markdown": markdown,
                "pages": len(analysis_results),
                "format": self._detect_format(document_url)
            },
            "metadata": {
                "title": self._extract_title(analysis_results),
                "page_count": len(analysis_results),
                "table_count": len(all_tables),
                "figure_count": len(all_figures),
                "analyzer": "deepdoctection"
            },
            "tables": all_tables,
            "figures": all_figures,
            "pages": analysis_results
        }

    def _build_markdown(self, analysis_results: List[Dict[str, Any]]) -> str:
        """Build markdown representation of the document"""
        markdown_parts = []

        for page in analysis_results:
            page_num = page.get("page_number", 0)
            markdown_parts.append(f"## Page {page_num}\n")

            # Add text
            if page.get("text"):
                markdown_parts.append(page["text"] + "\n")

            # Add table references
            tables = page.get("tables", [])
            if tables:
                markdown_parts.append(f"\n### Tables (Page {page_num})")
                for i, table in enumerate(tables):
                    markdown_parts.append(f"- Table {i+1}: {table.get('columns', 0)} columns")

            # Add figure references
            figures = page.get("figures", [])
            if figures:
                markdown_parts.append(f"\n### Figures (Page {page_num})")
                for i, fig in enumerate(figures):
                    caption = fig.get('caption', 'No caption')
                    markdown_parts.append(f"- Figure {i+1}: {caption}")

        return "\n".join(markdown_parts)

    def _detect_format(self, url: str) -> str:
        """Detect document format from URL"""
        url_lower = url.lower()
        if '.pdf' in url_lower:
            return 'pdf'
        elif '.png' in url_lower or '.jpg' in url_lower or '.jpeg' in url_lower:
            return 'image'
        elif '.tiff' in url_lower or '.tif' in url_lower:
            return 'tiff'
        return 'unknown'

    def _extract_title(self, analysis_results: List[Dict[str, Any]]) -> str:
        """Try to extract title from document"""
        if not analysis_results:
            return "Untitled Document"

        # Look for title in first page's layout elements
        first_page = analysis_results[0]
        for element in first_page.get("layout_elements", []):
            if element.get("type") == "title":
                return element.get("text", "Untitled Document")

        # Use first text line as fallback
        text = first_page.get("text", "")
        if text:
            lines = text.split('\n')
            if lines:
                return lines[0][:100]  # First 100 chars

        return "Untitled Document"


def main():
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

            # Create wrapper and process document
            wrapper = DeepDoctectionWrapper()
            result = wrapper.process_document(config)

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
    main()