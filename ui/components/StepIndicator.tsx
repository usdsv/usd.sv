// components/StepIndicator.tsx
import React from "react";

interface Props {
  currentStep: number;
}

const StepIndicator: React.FC<Props> = ({ currentStep }) => {
  const steps = ["Sign Intent", "Transfer Funds", "Observe Deployments", "View Destination"];

  return (
    <div style={{ margin: "1rem 0" }}>
      <ol style={{ display: "flex", listStyle: "none", padding: 0 }}>
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          return (
            <li
              key={step}
              style={{
                flex: 1,
                textAlign: "center",
                fontWeight: isActive ? "bold" : "normal",
                color: isActive ? "#1d6bfd" : "#6c757d"
              }}
            >
              {stepNum}. {step}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default StepIndicator;
