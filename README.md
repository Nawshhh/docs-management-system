# docs-management-system

for backend:
(make sure you have a python environment running)
1. cd backend
2. pip install fastapi uvicorn[standard] python-dotenv motor pymongo passlib[bcrypt] python-jose
3. .env file with MONGO_URI, MONGO_DB, JWT_SECRET, JWT_REFRESH_SECRET
4. python -m uvicorn app.main:app --reload

for frontend:
1. cd frontend
2. npm i or npm install
3. npm run dev
4. http://localhost:5173
