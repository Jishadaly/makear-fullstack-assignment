# Face Swap App

**Description:** A Node.js + Express application that allows users to upload images, optionally apply a style, and perform face swapping. The API uses MongoDB (classic driver) with full input validation, sanitization, secure file uploads, and JSON responses for easy integration.

---

## Features

- Upload an input image and style image.
- Input validation and sanitization.
- File type and size checks for uploads.
- JSON API responses for submissions and retrievals.
- SweetAlert2 integration for client-side notifications.
- Preview and download of swapped images.

---

## Example Flow:

- Fill in your Name, Phone, and Email.
- Upload your Input Image (your face).
- upload a Style Image (template you want your face to fit into).
- Submit the form → face swap happens → view and download the result.

---

## Setup

1. Clone the repository:

```bash
git clone https://github.com/Jishadaly/makear-fullstack-assignment.git
cd makear-fullstack-assignment.git
````

2. Install dependencies:

npm install

3. Create the uploads folder:

mkdir -p uploads

4. Start the server:
mpm run dev


Visit `http://localhost:3000` in your browser.

---

## Environment Variables

Create a `.env` file in the root:

```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/makeAr-Assignment
DB_NAME=makeAr-Assignment
FACE_SWAP_API_KEY=your_api_key_here
FACE_SWAP_API_URL=https://api.lightxeditor.com/external/api/v2
NODE_ENV=development
```

---

## API Documentation

You can view and test the API endpoints directly in Postman using the official collection:

[Postman Documentation & Collection](https://documenter.getpostman.com/view/30898790/2sB3HooeGF)

This collection includes:

* **GET** `/` – Get Form page.
* **POST** `/submit` – Submit a new face swap request.
* **GET** `/submissions` – Retrieve all submissions.
* **GET** `/submissions/:id` – Retrieve a single submission by ID.

Simply click **“Run in Postman”** to import the collection and test the endpoints.

---

## Notes

* No ORM is used; this app uses the classic MongoDB driver.
* Ensure MongoDB is running or your connection string points to a valid cluster.
* File uploads are validated and sanitized before storage.

