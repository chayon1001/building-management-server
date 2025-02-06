# Building Management System - Server

## Project Overview

This is the backend server for the Building Management System (BMS). It provides API endpoints for handling apartment management, user authentication, agreement processing, payment handling, and announcements.

Live Server URL : https://skyline-apartments.vercel.app/

## Key Features

- Authentication: Secure user authentication with JWT (JSON Web Token).

- Role-Based Access Control: Admin, member, and user roles with appropriate permissions.

- Agreement Management: Handles apartment agreements, approvals, and rejections.

- Payment Processing: Secure payment API with coupon management.

- Announcements: Admin can post announcements viewable by all users.

- Database Management: Secure and optimized MongoDB operations.

- Environment Variables: All sensitive credentials are stored securely.

- Error Handling: Robust error handling for all API routes.

- CORS Handling: Configured to allow access from specified origins.

- Deployment Ready: Properly configured for production environments.

## Deployment

- The server is deployed using Vercel/Render following these guidelines:

- Ensure no CORS/404/504 errors.

- Environment variables are set correctly in the hosting platform.

- Server should handle all expected API calls without failures.

## Technologies Used

- Node.js

- Express.js

- MongoDB

- JWT (JSON Web Token)

- Firebase Authentication

- TanStack Query
