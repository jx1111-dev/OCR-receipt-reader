from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pytesseract
from PIL import Image
import io
import re

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

#import session and record model from database.py
from database import SessionLocal, Record

ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"]

#initialize fastapi
app = FastAPI()

#configure cors middleware so frontend and backend can communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

#database session dependency for routes that need to access the database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def parse_receipt_text(text: str):

    #looks for numbers formatted like prices in the extracted text
    totals = re.findall(r'\(?\d+[\.,]\d{2}\)?', text)

    #splits the text into individual lines and gets rid of whitepsace
    lines = [line.strip() for line in text.split('\n') if line.strip()]

    #inefficient. assumes the first line of the text is the vendor. 
    #if empty puts down unknown vendor
    vendor = lines[0] if lines else "Unknown Vendor"

    #takes the last number in the text as a total after it converts 
    #it to a float, total_amount set to 0 if no numbers are found
    #also removes commas and replaces them with periods so the float
    #conversion doesnt throw an error
    total_amount = float(totals[-1].replace(',', '.')) if totals else 0.0

    #returns neat dictionary with the structured data along raw ocr text
    return {
        "vendor": vendor,
        "total": total_amount,
        "raw_text": text
    }

#route handler for incoming http post requests
@app.post("/api/extract")

#async function that takes uploaded file, reads it, uses pytesseract to
#extract text from the image, then parses the text and returns it
async def extract_data(file: UploadFile = File(...)):

    #validation
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type '{file.content_type}'. Please upload a JPG, PNG, or WEBP image."
        )

    try:
        #stores a file as bytes
        image_bytes = await file.read()

        #opens the image from the bytes using pillow
        image = Image.open(io.BytesIO(image_bytes))

        #extracts text from the image via pytesseract 
        extracted_text = pytesseract.image_to_string(image)

        #parses the text to extract structured data
        parsed = parse_receipt_text(extracted_text)
        
        return parsed
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")

#route handler for creating new records
@app.post("/api/records")
def create_record(vendor: str, total: float, category: str = "General", db: Session = Depends(get_db)):
    record = Record(vendor=vendor, total=total, category=category)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

#route handler for getting all records
@app.get("/api/records")
def get_records(db: Session = Depends(get_db)):
    return db.query(Record).all()

#route handler for deleting a record by id
@app.delete("/api/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": f"Record {record_id} deleted successfully"}