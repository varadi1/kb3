#!/usr/bin/env python3
"""
DeepDoctection Python wrapper v2 - Optimized for compatibility
Uses available ML libraries for document analysis
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

# Suppress verbose output
logging.basicConfig(level=logging.ERROR)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Check available libraries
LIBRARIES_STATUS = {
    'deepdoctection': False,
    'layoutparser': False,
    'easyocr': False,
    'pypdf': False,
    'pdfplumber': False
}

# Try importing libraries
try:
    import layoutparser as lp
    LIBRARIES_STATUS['layoutparser'] = True
except ImportError:
    pass

try:
    import easyocr
    LIBRARIES_STATUS['easyocr'] = True
except ImportError:
    pass

try:
    import pypdf
    LIBRARIES_STATUS['pypdf'] = True
except ImportError:
    pass

try:
    import pdfplumber
    LIBRARIES_STATUS['pdfplumber'] = True
except ImportError:
    pass

# Try importing deepdoctection with fallback
try:
    # Suppress warnings during import
    import warnings
    warnings.filterwarnings('ignore')

    with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
        import deepdoctection as dd
        LIBRARIES_STATUS['deepdoctection'] = True
except Exception:
    pass


class DocumentAnalyzer:
    """Unified document analyzer using available libraries"""

    def __init__(self):
        self.ocr_reader = None
        self.layout_model = None
        self._initialize_tools()

    def _initialize_tools(self):
        """Initialize available tools"""
        # Initialize EasyOCR if available
        if LIBRARIES_STATUS['easyocr']:
            try:
                self.ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            except:
                pass

        # Initialize LayoutParser if available
        if LIBRARIES_STATUS['layoutparser']:
            try:
                # Use a lightweight model
                self.layout_model = lp.AutoLayoutModel('lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config')
            except:
                pass

    def analyze_document(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze document using available tools

        Args:
            config: Processing configuration

        Returns:
            Dictionary with analysis results
        """
        document_url = config.get("document_url")
        options = config.get("options", {})

        if not document_url:
            return {
                "success": False,
                "error": "document_url is required"
            }

        try:
            # Download document
            document_path = self._download_document(document_url)

            # Determine document type
            doc_type = self._get_document_type(document_path)

            # Process based on type and available libraries
            if doc_type == 'pdf':
                result = self._process_pdf(document_path, options)
            elif doc_type in ['png', 'jpg', 'jpeg']:
                result = self._process_image(document_path, options)
            else:
                result = self._process_generic(document_path, options)

            # Clean up
            if document_path.startswith('/tmp/'):
                os.unlink(document_path)

            return result

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc()
            }

    def _download_document(self, url: str) -> str:
        """Download document from URL"""
        if not url.startswith('http'):
            return url

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Determine file extension
        ext = '.pdf'
        if '.pdf' in url.lower():
            ext = '.pdf'
        elif any(x in url.lower() for x in ['.png', '.jpg', '.jpeg']):
            ext = '.jpg'

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(response.content)
            return tmp.name

    def _get_document_type(self, path: str) -> str:
        """Determine document type from path"""
        path_lower = path.lower()
        if path_lower.endswith('.pdf'):
            return 'pdf'
        elif any(path_lower.endswith(ext) for ext in ['.png', '.jpg', '.jpeg']):
            return 'image'
        return 'unknown'

    def _process_pdf(self, path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Process PDF document"""
        text = ""
        tables = []
        metadata = {}
        pages_data = []

        # Try pdfplumber first (best for tables)
        if LIBRARIES_STATUS['pdfplumber']:
            try:
                import pdfplumber
                with pdfplumber.open(path) as pdf:
                    metadata['page_count'] = len(pdf.pages)

                    for i, page in enumerate(pdf.pages):
                        page_text = page.extract_text() or ""
                        text += f"\n--- Page {i+1} ---\n{page_text}"

                        # Extract tables
                        page_tables = page.extract_tables()
                        if page_tables:
                            for table in page_tables:
                                tables.append({
                                    'page': i+1,
                                    'data': table
                                })

                        pages_data.append({
                            'page_number': i+1,
                            'text': page_text,
                            'table_count': len(page_tables) if page_tables else 0
                        })

            except Exception as e:
                pass

        # Fallback to pypdf for text extraction
        if not text and LIBRARIES_STATUS['pypdf']:
            try:
                import pypdf
                reader = pypdf.PdfReader(path)
                metadata['page_count'] = len(reader.pages)

                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    text += f"\n--- Page {i+1} ---\n{page_text}"
                    pages_data.append({
                        'page_number': i+1,
                        'text': page_text
                    })
            except:
                pass

        # Try DeepDoctection if available and configured
        if LIBRARIES_STATUS['deepdoctection'] and options.get('use_deepdoctection', False):
            try:
                with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                    # Use minimal configuration
                    analyzer = dd.get_dd_analyzer(config_overwrite={
                        "USE_OCR": False,
                        "USE_PDF_TEXT": True
                    })

                    df = dd.DataFromList([path])
                    for page in analyzer.analyze(dataset_dataflow=df):
                        if hasattr(page, 'tables'):
                            for table in page.tables:
                                tables.append({
                                    'type': 'deepdoctection',
                                    'data': str(table)
                                })
            except:
                pass

        return {
            "success": True,
            "document": {
                "text": text,
                "pages": len(pages_data),
                "format": "pdf"
            },
            "metadata": metadata,
            "tables": tables,
            "pages": pages_data,
            "libraries_used": [k for k, v in LIBRARIES_STATUS.items() if v]
        }

    def _process_image(self, path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Process image document"""
        text = ""
        layout_elements = []

        # Use EasyOCR if available
        if LIBRARIES_STATUS['easyocr'] and self.ocr_reader and options.get('ocr', True):
            try:
                results = self.ocr_reader.readtext(path)
                text_parts = []
                for (bbox, text_content, prob) in results:
                    if prob > 0.5:  # Confidence threshold
                        text_parts.append(text_content)
                text = ' '.join(text_parts)
            except:
                pass

        # Use LayoutParser if available
        if LIBRARIES_STATUS['layoutparser'] and self.layout_model:
            try:
                import cv2
                image = cv2.imread(path)
                layout = self.layout_model.detect(image)

                for block in layout:
                    layout_elements.append({
                        'type': block.type,
                        'coordinates': block.coordinates,
                        'score': float(block.score)
                    })
            except:
                pass

        return {
            "success": True,
            "document": {
                "text": text,
                "format": "image"
            },
            "metadata": {
                "ocr_performed": bool(text),
                "layout_detected": len(layout_elements) > 0
            },
            "layout_elements": layout_elements,
            "libraries_used": [k for k, v in LIBRARIES_STATUS.items() if v]
        }

    def _process_generic(self, path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Process generic document"""
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        except:
            text = ""

        return {
            "success": True,
            "document": {
                "text": text[:10000],  # Limit size
                "format": "text"
            },
            "metadata": {
                "file_size": os.path.getsize(path)
            },
            "libraries_used": [k for k, v in LIBRARIES_STATUS.items() if v]
        }


def main():
    """Main entry point"""
    try:
        if len(sys.argv) < 2:
            result = {
                "success": False,
                "error": "Configuration argument required"
            }
        else:
            config_json = sys.argv[1]
            config = json.loads(config_json)

            analyzer = DocumentAnalyzer()
            result = analyzer.analyze_document(config)

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