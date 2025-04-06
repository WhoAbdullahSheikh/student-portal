import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  FaBook,
  FaUserGraduate,
  FaClipboardCheck,
  FaChartLine,
  FaPlus,
  FaCheck,
} from "react-icons/fa";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch student info from session
  useEffect(() => {
    const userFromSession = JSON.parse(sessionStorage.getItem("user"));

    if (userFromSession) {
      setStudentInfo({
        id: auth.currentUser?.uid || userFromSession.uid,
        name: userFromSession.displayName,
        email: userFromSession.email,
      });
    } else {
      // If no session data, redirect to login
      navigate("/signin");
    }
  }, [navigate]);

  // Only proceed with other operations if studentInfo is available
  useEffect(() => {
    if (!studentInfo?.id) return;

    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      const coursesData = [];
      snapshot.forEach((doc) => {
        coursesData.push({ id: doc.id, ...doc.data() });
      });
      setCourses(coursesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentInfo?.id]);

  // Fetch attendance data for the student
  useEffect(() => {
    if (!studentInfo?.id) return;

    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", studentInfo.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let attended = 0;
      let total = 0;
      const attendanceByCourse = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "present") attended++;
        total++;

        // Group by course
        if (!attendanceByCourse[data.courseId]) {
          attendanceByCourse[data.courseId] = { attended: 0, total: 0 };
        }
        if (data.status === "present") {
          attendanceByCourse[data.courseId].attended++;
        }
        attendanceByCourse[data.courseId].total++;
      });

      setAttendance({
        overall: {
          attended,
          total,
          percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
        },
        byCourse: attendanceByCourse,
      });
    });

    return () => unsubscribe();
  }, [studentInfo?.id]);

  const handleEnrollClick = (course) => {
    setSelectedCourse(course);
    setOpenEnrollDialog(true);
  };

  const handleEnroll = async () => {
    try {
      // Add student to the course's enrolledStudents array
      const courseRef = doc(db, "courses", selectedCourse.id);
      await updateDoc(courseRef, {
        enrolledStudents: arrayUnion({
          id: studentInfo.id,
          name: studentInfo.name,
          email: studentInfo.email,
          enrolledAt: new Date(),
        }),
      });

      setSnackbar({
        open: true,
        message: `Successfully enrolled in ${selectedCourse.name}`,
        severity: "success",
      });
      setOpenEnrollDialog(false);
    } catch (error) {
      console.error("Error enrolling: ", error);
      setSnackbar({
        open: true,
        message: "Failed to enroll in course",
        severity: "error",
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Get enrolled courses (where student is in enrolledStudents array)
  const enrolledCourses = courses.filter((course) =>
    course.enrolledStudents?.some((student) => student.id === studentInfo.id)
  );

  // Get available courses (not enrolled yet)
  const availableCourses = courses.filter(
    (course) =>
      !course.enrolledStudents?.some((student) => student.id === studentInfo.id)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <>
        <Typography
          variant="h4"
          sx={{
            mb: 3,
            display: "flex",
            alignItems: "center",
            fontFamily: "Raleway-Bold, sans-serif",
          }}
        >
          Student Dashboard <FaUserGraduate style={{ marginLeft: "10px" }} />
        </Typography>

        {/* Statistics Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 3,
            marginBottom: "30px",
          }}
        >
          <StatCard
            icon={<FaBook />}
            title="Enrolled Courses"
            value={enrolledCourses.length}
            color="#4e73df"
          />
          <StatCard
            icon={<FaClipboardCheck />}
            title="Attendance Rate"
            value={`${attendance.overall?.percentage || 0}%`}
            color="#1cc88a"
          />
          <StatCard
            icon={<FaChartLine />}
            title="Classes Attended"
            value={`${attendance.overall?.attended || 0}/${
              attendance.overall?.total || 0
            }`}
            color="#f6c23e"
          />
        </Box>

        {/* Enrolled Courses Section */}
        <Box
          sx={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: 1,
            marginBottom: "30px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">My Courses</Typography>
            {loading && <CircularProgress size={24} />}
          </Box>

          {enrolledCourses.length === 0 && !loading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                You are not enrolled in any courses yet.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 2,
              }}
            >
              {enrolledCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  attendance={attendance.byCourse[course.id]}
                  enrolled
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Available Courses Section */}
        <Box
          sx={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: 1,
            marginBottom: "30px",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Available Courses
          </Typography>
          {availableCourses.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No available courses at the moment.
            </Typography>
          ) : (
            <List>
              {availableCourses.map((course) => (
                <React.Fragment key={course.id}>
                  <ListItem
                    secondaryAction={
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleEnrollClick(course)}
                        startIcon={<FaPlus />}
                      >
                        Enroll
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <FaBook />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={course.name}
                      secondary={`${course.instructor} • ${course.code}`}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Attendance Section */}
        <Box
          sx={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Attendance Overview
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "2fr 1fr",
              },
              gap: 3,
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Your overall attendance rate is{" "}
                <strong>{attendance.overall?.percentage || 0}%</strong>. You've
                attended {attendance.overall?.attended || 0} out of{" "}
                {attendance.overall?.total || 0} classes.
              </Typography>
              <Box
                sx={{
                  height: "10px",
                  backgroundColor: "#eee",
                  borderRadius: "5px",
                  overflow: "hidden",
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: `${attendance.overall?.percentage || 0}%`,
                    height: "100%",
                    backgroundColor:
                      (attendance.overall?.percentage || 0) > 75
                        ? "#1cc88a"
                        : (attendance.overall?.percentage || 0) > 50
                        ? "#f6c23e"
                        : "#e74a3b",
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {(attendance.overall?.percentage || 0) > 90
                  ? "Excellent attendance! Keep it up!"
                  : (attendance.overall?.percentage || 0) > 75
                  ? "Good attendance. You're doing well!"
                  : (attendance.overall?.percentage || 0) > 50
                  ? "Your attendance needs improvement."
                  : "Poor attendance. Please attend more classes."}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  backgroundColor: "#f8f9fa",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  mb: 2,
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: "bold",
                    color:
                      (attendance.overall?.percentage || 0) > 75
                        ? "#1cc88a"
                        : (attendance.overall?.percentage || 0) > 50
                        ? "#f6c23e"
                        : "#e74a3b",
                  }}
                >
                  {attendance.overall?.percentage || 0}%
                </Typography>
              </Box>
              <Button variant="outlined" size="small">
                View Details
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Enroll Confirmation Dialog */}
        <Dialog
          open={openEnrollDialog}
          onClose={() => setOpenEnrollDialog(false)}
        >
          <DialogTitle>Confirm Enrollment</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You are about to enroll in:
            </Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {selectedCourse?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Instructor: {selectedCourse?.instructor}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Course Code: {selectedCourse?.code}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Credits: {selectedCourse?.credits || "3"}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEnrollDialog(false)}>Cancel</Button>
            <Button
              onClick={handleEnroll}
              color="primary"
              variant="contained"
              startIcon={<FaCheck />}
            >
              Confirm Enrollment
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    </motion.div>
  );
};

const StatCard = ({ icon, title, value, color }) => (
  <Box
    sx={{
      background: "#0f1728",
      color: "#fff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: 1,
      borderLeft: `4px solid ${color}`,
      display: "flex",
      alignItems: "center",
      gap: "15px",
    }}
  >
    <Box
      sx={{
        backgroundColor: `${color}20`,
        color: color,
        borderRadius: "50%",
        width: "50px",
        height: "50px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography
        variant="subtitle2"
        sx={{
          color: "#7f8c8d",
          fontFamily: "Raleway-Bold, sans-serif",
        }}
      >
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: "bold" }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

const CourseCard = ({ course, attendance, enrolled }) => {
  const attendancePercentage = attendance
    ? Math.round((attendance.attended / attendance.total) * 100)
    : 0;

  return (
    <Box
      sx={{
        border: "1px solid #eee",
        borderRadius: "8px",
        padding: "16px",
        transition: "box-shadow 0.3s",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {course.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {course.instructor}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Chip
          label={enrolled ? "Enrolled" : "Available"}
          size="small"
          color={enrolled ? "success" : "info"}
        />
        {enrolled && attendance && (
          <Chip
            label={`${attendancePercentage}%`}
            size="small"
            color={
              attendancePercentage > 75
                ? "success"
                : attendancePercentage > 50
                ? "warning"
                : "error"
            }
          />
        )}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="caption">Code: {course.code}</Typography>
        <Typography variant="caption">
          Credits: {course.credits || "3"}
        </Typography>
      </Box>
      {enrolled && attendance && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" display="block">
            Attendance: {attendance.attended}/{attendance.total}
          </Typography>
          <Box
            sx={{
              height: "6px",
              backgroundColor: "#eee",
              borderRadius: "3px",
              overflow: "hidden",
              mt: 1,
            }}
          >
            <Box
              sx={{
                width: `${attendancePercentage}%`,
                height: "100%",
                backgroundColor:
                  attendancePercentage > 75
                    ? "#1cc88a"
                    : attendancePercentage > 50
                    ? "#f6c23e"
                    : "#e74a3b",
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
