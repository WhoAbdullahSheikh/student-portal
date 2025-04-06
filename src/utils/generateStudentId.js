// src/utils/generateStudentId.js
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../libs/firebase";

export const generateStudentId = async () => {
  try {
    // Query both collections for the highest student ID
    const emailQuery = query(
      collection(db, "Std_email"),
      orderBy("userData.studentId", "desc"),
      limit(1)
    );
    const googleQuery = query(
      collection(db, "Std_google"),
      orderBy("userData.studentId", "desc"),
      limit(1)
    );

    // Execute both queries in parallel
    const [emailSnapshot, googleSnapshot] = await Promise.all([
      getDocs(emailQuery),
      getDocs(googleQuery),
    ]);

    let maxNumber = 0;

    // Check email collection
    if (!emailSnapshot.empty) {
      const emailId = emailSnapshot.docs[0].data().userData.studentId;
      const emailNumber = parseInt(emailId.split("@")[0]);
      maxNumber = Math.max(maxNumber, emailNumber);
    }

    // Check google collection
    if (!googleSnapshot.empty) {
      const googleId = googleSnapshot.docs[0].data().userData.studentId;
      const googleNumber = parseInt(googleId.split("@")[0]);
      maxNumber = Math.max(maxNumber, googleNumber);
    }

    // Increment the highest found number
    const newNumber = maxNumber + 1;
    return `${newNumber}@student.campusflo`;
  } catch (error) {
    console.error("Error generating student ID:", error);
    // Fallback with random number if there's an error
    return `${Math.floor(Math.random() * 10000)}@student.campusflo`;
  }
};