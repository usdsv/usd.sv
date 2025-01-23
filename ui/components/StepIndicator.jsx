import React from "react";
import { Box, Typography } from "@mui/material";

const StepIndicator = ({ currentStep }) => {
  const steps = [
    "Sign Intent",
    "Sign Permit",
    "Observe Deployments",
    "View Destination",
  ];

  return (
    <Box sx={{ width: "100%", py: 1 }}>
      <Box
        component="ol"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;

          return (
            <Box component="li" key={step}>
              <Typography
                component="span"
                sx={{
                  flex: 1,
                  textAlign: "center",
                  fontWeight: isActive ? "bold" : "normal",
                  color: isActive ? "#1d6bfd" : "#6c757d", // Active/Inactive colors
                  fontSize: isActive ? "1.1rem" : "1rem", // Slightly larger for active step
                }}
              >
                {stepNum}. {step}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default StepIndicator;
