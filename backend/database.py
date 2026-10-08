from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./receipts.db"

#connection to the database, allows multiple threads access to the db
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

#makes new session for each request to the database, allows for transactions
#changes are only saved when db.commit() is called and can be rolled back
#so you dont muck up the whole thing if something goes wrong
#autoflush is false so that changes are only made on db.commit()
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

#base for all models to inherit from
Base = declarative_base()

#maps the record class to the records table in the db
class Record(Base):
    __tablename__ = "records"

    #columns for the records table
    id = Column(Integer, primary_key=True, index=True)
    vendor = Column(String, default="Unknown")
    total = Column(Float, default=0.0)
    category = Column(String, default="General")

#creates the records table in the database if it doesnt already exist
Base.metadata.create_all(bind=engine)