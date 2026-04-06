import { useEffect, useMemo, useRef } from "react";

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(Number(totalSeconds || 0), 0);
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const seconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function EmailOtpVerificationPage({ app }) {
  const {
    emailOtpVerification,
    setEmailOtpVerification,
    emailOtpCode,
    setEmailOtpCode,
    verifyEmailOtp,
    resendEmailOtp,
    loading,
    navigate,
  } = app;
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!emailOtpVerification?.verification_token) {
      navigate("/login", true);
    }
  }, [emailOtpVerification, navigate]);

  useEffect(() => {
    if (!emailOtpVerification?.verification_token) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setEmailOtpVerification((previous) => {
        if (!previous?.verification_token) {
          return previous;
        }
        return {
          ...previous,
          resend_after_seconds: Math.max((previous.resend_after_seconds || 0) - 1, 0),
          expires_in_seconds: Math.max((previous.expires_in_seconds || 0) - 1, 0),
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [emailOtpVerification?.verification_token, setEmailOtpVerification]);

  const otpDigits = useMemo(() => {
    const normalizedCode = String(emailOtpCode || "").replace(/\D/g, "").slice(0, 6);
    return Array.from({ length: 6 }, (_, index) => normalizedCode[index] || "");
  }, [emailOtpCode]);

  function updateOtpDigit(index, value) {
    const nextCharacter = String(value || "").replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = nextCharacter;
    const nextCode = nextDigits.join("");
    setEmailOtpCode(nextCode);

    if (nextCharacter && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, event) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(event) {
    event.preventDefault();
    const pastedValue = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedValue) {
      return;
    }
    setEmailOtpCode(pastedValue);
    inputRefs.current[Math.min(pastedValue.length, 6) - 1]?.focus();
  }

  const canResend = (emailOtpVerification?.resend_after_seconds || 0) <= 0;
  const expiresSoon = (emailOtpVerification?.expires_in_seconds || 0) <= 60;

  return (
    <main className="otp-page">
      <section className="otp-shell">
        <div className="otp-illustration-card">
          <button type="button" className="otp-close-button" onClick={() => navigate("/login", true)} aria-label="Close verification">
            ×
          </button>
          <div className="otp-envelope-art">
            <div className="otp-envelope-flap" />
            <div className="otp-envelope-body" />
            <div className="otp-envelope-note" />
          </div>
          <div className="otp-channel-switch">
            <span className="otp-channel-pill otp-channel-active">Email</span>
            <span className="otp-channel-pill">Google</span>
          </div>
          <div className="otp-copy-block">
            <h2>Verify your email</h2>
            <p>We sent a 6-digit verification code to {emailOtpVerification?.masked_email || "your email"}.</p>
          </div>
          <div className="otp-meta-strip">
            <div>
              <span>Expires in</span>
              <strong className={expiresSoon ? "otp-danger-text" : ""}>{formatCountdown(emailOtpVerification?.expires_in_seconds || 0)}</strong>
            </div>
            <div>
              <span>Resend</span>
              <strong>{canResend ? "Ready" : formatCountdown(emailOtpVerification?.resend_after_seconds || 0)}</strong>
            </div>
          </div>
        </div>

        <div className="otp-form-card">
          <button type="button" className="otp-close-button" onClick={() => navigate("/login", true)} aria-label="Close verification">
            ×
          </button>
          <div className="otp-lock-badge">
            <span className="otp-lock-shackle" />
            <span className="otp-lock-body" />
          </div>
          <div className="otp-form-copy">
            <h2>Enter OTP Code</h2>
            <p>Complete verification to finish sign-in and open your account.</p>
          </div>

          <div className="otp-input-row" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={`otp-digit-${index + 1}`}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                className="otp-digit-input"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={(event) => updateOtpDigit(index, event.target.value)}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="otp-resend-link"
            onClick={resendEmailOtp}
            disabled={!canResend || loading}
          >
            {canResend ? "Resend code" : `Resend in ${formatCountdown(emailOtpVerification?.resend_after_seconds || 0)}`}
          </button>

          <button type="button" className="otp-submit-button" onClick={verifyEmailOtp} disabled={loading}>
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default EmailOtpVerificationPage;
