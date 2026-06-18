import os
import pdfplumber
import pandas as pd
from pathlib import Path

def convert_pdf_to_csv(pdf_path: str, csv_path: str):
    print(f"Converting {pdf_path} to CSV...")
    all_data = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        # Clean up None values
                        cleaned_row = [str(cell).replace('\n', ' ').strip() if cell is not None else "" for cell in row]
                        all_data.append(cleaned_row)
        
        if all_data:
            # Assuming first row is header
            df = pd.DataFrame(all_data[1:], columns=all_data[0])
            df.to_csv(csv_path, index=False)
            print(f"Successfully saved to {csv_path}")
        else:
            print(f"No tables found in {pdf_path}")
            
    except Exception as e:
        print(f"Error converting {pdf_path}: {e}")

if __name__ == "__main__":
    base_dir = Path(r"c:\CODING\nothing-sim-pvt\datasets")
    
    pdfs_to_convert = [
        "CoC_AwardComp_NatlTerrDC_2024.pdf",
        "CoC_HIC_NatlTerrDC_2025.pdf"
    ]
    
    for pdf_file in pdfs_to_convert:
        pdf_path = base_dir / pdf_file
        csv_path = base_dir / (pdf_path.stem + ".csv")
        
        if pdf_path.exists():
            convert_pdf_to_csv(str(pdf_path), str(csv_path))
        else:
            print(f"File not found: {pdf_path}")
