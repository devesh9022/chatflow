
import { useState } from "react";
import { MessageCircle, Eye, EyeOff } from "lucide-react";
import "./Auth.css";

function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters");
      return;
    }

    try {
      setLoading(true);

      const endpoint = isLogin ? "login" : "register";

      const response = await fetch(
        `http://localhost:5000/api/auth/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(isLogin ? {} : { name }),
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      // Store authentication details
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccess(data.message);

      // Notify parent component
      if (onAuthSuccess) {
        onAuthSuccess(data);
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);

    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    setError("");
    setSuccess("");
  };

  return (
    <div className="auth-container">

      <div className="auth-background-circle circle-one"></div>
      <div className="auth-background-circle circle-two"></div>

      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-icon">
            <MessageCircle size={30} />
          </div>

          <h1>ChatFlow</h1>

          <p>Connect. Communicate. Share.</p>
        </div>

        <div className="auth-heading">
          <h2>
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>

          <p>
            {isLogin
              ? "Login to continue your conversations"
              : "Join ChatFlow and start connecting"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {!isLogin && (
            <div className="auth-form-group">
              <label>Full Name</label>

              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-form-group">
            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-form-group">
            <label>Password</label>

            <div className="auth-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={
                  isLogin ? "current-password" : "new-password"
                }
              />

              <button
                type="button"
                className="auth-eye-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="auth-form-group">
              <label>Confirm Password</label>

              <div className="auth-password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="auth-eye-button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                >
                  {showConfirmPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Login"
                : "Create Account"}
          </button>

        </form>

        <div className="auth-switch">
          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}

          <button type="button" onClick={switchMode}>
            {isLogin ? "Register" : "Login"}
          </button>
        </div>

        <p className="auth-footer">
          Secure messaging experience
        </p>

      </div>
    </div>
  );
}

export default Auth;
