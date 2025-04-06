import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "@mui/material";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import GoogleLogo from "../../assets/svg/google.svg";
import { useNavigate } from "react-router-dom";
import { serverTimestamp } from "firebase/firestore";
import { generateStudentId } from "../../utils/generateStudentId";

const GoogleAuth = ({ openSnackbar, setOpenSnackbar, setSnackbarMessage, setSnackbarSeverity }) => {
  const navigate = useNavigate();

  // Function to generate student ID (same as in SignUp component)
  const generateStudentId = async () => {
    try {
      // Check both collections (email and google) for the highest student ID
      const emailStudentsRef = collection(db, "Std_email");
      const googleStudentsRef = collection(db, "Std_google");
      
      const q1 = query(emailStudentsRef, orderBy("userData.studentId", "desc"), limit(1));
      const q2 = query(googleStudentsRef, orderBy("userData.studentId", "desc"), limit(1));
      
      const [emailSnapshot, googleSnapshot] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      let lastNumbers = [];
      
      if (!emailSnapshot.empty) {
        const lastId = emailSnapshot.docs[0].data().userData.studentId;
        lastNumbers.push(parseInt(lastId.split('@')[0]) || 0);
      }
      
      if (!googleSnapshot.empty) {
        const lastId = googleSnapshot.docs[0].data().userData.studentId;
        lastNumbers.push(parseInt(lastId.split('@')[0]) || 0);
      }
      
      const lastNumber = lastNumbers.length > 0 ? Math.max(...lastNumbers) : 0;
      const newNumber = lastNumber + 1;
      return `${newNumber}@student.campusflo`;
    } catch (error) {
      console.error("Error generating student ID:", error);
      return `${Math.floor(Math.random() * 10000)}@student.campusflo`;
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
  
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
  
      const userRef = doc(db, "Std_google", user.uid);
      const userSnapshot = await getDoc(userRef);
  
      if (userSnapshot.exists()) {
        setSnackbarMessage("This account is already linked with Google. Please sign in.");
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      } else {
        // Generate student ID using the shared function
        const studentId = await generateStudentId();
        
        await setDoc(userRef, {
          userData: {
            email: user.email,
            name: user.displayName,
            username: user.displayName.replace(/\s+/g, "").toLowerCase(),
            studentId: studentId,
            createdAt: serverTimestamp(),
            photoURL: user.photoURL,
          },
          signUpMethods: ["Google"],
        });
  
        setSnackbarMessage(`Account created successfully! Your Student ID: ${studentId}`);
        setSnackbarSeverity("success");
        setOpenSnackbar(true);
  
        setTimeout(() => {
          navigate("/signin");
        }, 2000);
      }
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      setSnackbarMessage("An error occurred during Google sign-in.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      variant="contained"
      fullWidth
      sx={{
        mt: 2,
        py: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        backgroundColor: "#0f1728",
        textTransform: "none",
        fontFamily: "Raleway, sans-serif",
        borderRadius: "10px",
        "&:hover": {
          backgroundColor: "rgba(15, 23, 40, 0.9)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          transform: "scale(1.01)",
        },
      }}
    >
      <img src={GoogleLogo} alt="Google logo" style={{ marginRight: "10px", width: "20px", height: "20px" }} />
      Continue with Google
    </Button>
  );
};

export default GoogleAuth;