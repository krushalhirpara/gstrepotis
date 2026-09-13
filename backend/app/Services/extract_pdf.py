    import sys
import json
import os

def extract_pdf_data(pdf_path, password=None):
    if not os.path.exists(pdf_path):
        return {"success": False, "error": "File not found"}

    is_encrypted = False
    page_count = 0
    text_lines = []
    table_rows = []
    total_text_length = 0

    try:
        import pdfplumber

        with pdfplumber.open(pdf_path, password=password if password else None) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                # Extract text
                page_text = page.extract_text()
                if page_text:
                    total_text_length += len(page_text.strip())
                    for line in page_text.splitlines():
                        trimmed = line.strip()
                        if trimmed:
                            text_lines.append(trimmed)

                # Extract tables
                try:
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            clean_row = [str(c).strip() if c is not None else "" for c in row]
                            if any(clean_row):
                                table_rows.append(clean_row)
                except Exception:
                    pass

        is_scanned = (total_text_length < (page_count * 25))

        return {
            "success": True,
            "page_count": page_count,
            "is_encrypted": is_encrypted,
            "is_scanned": is_scanned,
            "has_selectable_text": not is_scanned and (total_text_length > 0),
            "text": "\n".join(text_lines),
            "lines": text_lines,
            "table_rows": table_rows
        }
    except Exception as e:
        err_msg = str(e).lower()
        if "password" in err_msg or "encrypt" in err_msg or "protected" in err_msg:
            is_encrypted = True
            return {
                "success": False,
                "is_encrypted": True,
                "error": "Password protected PDF"
            }

        # Fallback to pypdf
        try:
            from pypdf import PdfReader
            reader = PdfReader(pdf_path)
            page_count = len(reader.pages)
            if reader.is_encrypted:
                is_encrypted = True
                if password:
                    reader.decrypt(password)
                else:
                    return {
                        "success": False,
                        "is_encrypted": True,
                        "error": "Password protected PDF"
                    }

            text_lines = []
            total_text_length = 0
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    total_text_length += len(t.strip())
                    text_lines.extend([l.strip() for l in t.splitlines() if l.strip()])

            is_scanned = (total_text_length < (page_count * 25))

            return {
                "success": True,
                "page_count": page_count,
                "is_encrypted": is_encrypted,
                "is_scanned": is_scanned,
                "has_selectable_text": not is_scanned and (total_text_length > 0),
                "text": "\n".join(text_lines),
                "lines": text_lines,
                "table_rows": []
            }
        except Exception as e2:
            e2_msg = str(e2).lower()
            if "password" in e2_msg or "encrypt" in e2_msg:
                return {
                    "success": False,
                    "is_encrypted": True,
                    "error": "Password protected PDF"
                }
            return {
                "success": False,
                "error": str(e2)
            }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No PDF path provided"}))
        sys.exit(1)

    pdf_file = sys.argv[1]
    pwd = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "null" else None
    
    result = extract_pdf_data(pdf_file, pwd)
    print(json.dumps(result))

