import React from "react";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"; // Import an icon from Material-UI

const Home = () => {
  return (
    <Box
      sx={{
        maxWidth: "lg",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
        minHeight: "80vh",
        gap: 1,
        px: 3,
      }}
    >
      {/* Left Section: List */}
      <Box
        sx={{
          flex: 2,
          maxWidth: { xs: "100%", md: "50%" },
          textAlign: "left",
        }}
      >
        <Typography variant="h3" gutterBottom sx={{ fontWeight: "bold" }}>
          Intent-Based Cross-Chain Bridge Demo
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          This is a sample UI to demonstrate how a user can:
        </Typography>

        <List>
          {[
            "Sign an intent (order)",
            "Transfer funds to the ephemeral intent address",
            "Observe contract deployments on source/destination",
            "View final bridging on the destination chain",
          ].map((item, index) => (
            <ListItem key={index} disablePadding>
              <ListItemText
                primary={`${index + 1}. ${item}`}
                primaryTypographyProps={{
                  variant: "body1",
                }}
              />
            </ListItem>
          ))}
        </List>

        {/* Call-to-Action Button */}
        <Link href="/signer" passHref>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />} // Add icon on the right
            sx={{
              mt: 1,
              backgroundColor: "#D87068", // Custom button color
              color: "#fff",
              "&:hover": { backgroundColor: "#c76058" }, // Hover effect
              fontSize: "16px",
              fontWeight: "bold",
              borderRadius: "8px",
              textTransform: "none",
            }}
          >
            Start the Flow
          </Button>
        </Link>
      </Box>

      {/* Right Section: Image */}
      <Box
        sx={{
          flex: 1,
          maxWidth: { xs: "100%", md: "50%" },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          src="/home-img-1.png" // Image path
          alt="Home Demo"
          width={600}
          height={600}
          style={{
            maxWidth: "100%",
            height: "auto",
            borderRadius: "8px",
          }}
        />
      </Box>
    </Box>
  );
};

export default Home;
