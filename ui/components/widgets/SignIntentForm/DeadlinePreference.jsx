import React, { useState } from "react";
import { Container, TextField, MenuItem, Typography, Box } from "@mui/material";

const DeadlinePreference = ({
  deadlinePreference,
  setDeadlinePreference,
  openDeadline,
  setOpenDeadline,
  fillDeadline,
  setFillDeadline,
  handleDeadlinePreferenceChange,
}) => {
  return (
    <Box sx={{ my: 3 }}>
      <Typography variant="h6" component="label" gutterBottom>
        Select Deadline Preference
      </Typography>

      {/* Deadline Preference Dropdown */}
      <TextField
        select
        label="Deadline Preference"
        value={deadlinePreference}
        onChange={(e) => handleDeadlinePreferenceChange(e.target.value)}
        fullWidth
        margin="normal"
      >
        <MenuItem value="Fast">Fast (&lt;1 min, highest fee)</MenuItem>
        <MenuItem value="Auto">Auto (&lt;5 min, modest fee)</MenuItem>
        <MenuItem value="Economy">Economy (5-10 min, cheapest fee)</MenuItem>
      </TextField>

      {/* Display Open Deadline */}
      <TextField
        type="number"
        label="Open Deadline (Unix Timestamp)"
        value={openDeadline}
        onChange={(e) => setOpenDeadline(e.target.value)}
        placeholder="Unix timestamp, e.g. 1699999999"
        fullWidth
        margin="normal"
        disabled
      />

      {/* Display Fill Deadline */}
      <TextField
        type="number"
        label="Fill Deadline (Unix Timestamp)"
        value={fillDeadline}
        onChange={(e) => setFillDeadline(e.target.value)}
        placeholder="Unix timestamp, e.g. 1699999999"
        fullWidth
        margin="normal"
        disabled
      />
    </Box>
  );
};

export default DeadlinePreference;
