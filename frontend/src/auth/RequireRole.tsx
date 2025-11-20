import { type ReactNode, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

interface RequireRoleProps {
  allowedRoles: Role[];      // which roles can access this route
  pageLabel: string;         
  children: ReactNode;
}

export function RequireRole({ allowedRoles, pageLabel, children }: RequireRoleProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  // prevent duplicate breach logs
  const breachLoggedRef = useRef(false);

  const logBreachOnce = async () => {
    if (breachLoggedRef.current) return;
    breachLoggedRef.current = true;
    try {
      await axios.post("http://localhost:8000/auth/page-breach", { page: pageLabel });
    } catch (e) {
      console.error("Failed to log page breach:", e);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get("http://localhost:8000/auth/me", {
          withCredentials: true,
        });

        const { ok, data, error } = res.data;

        if (!ok || !data) {
          await logBreachOnce();
          toast.error(error || "Unable to verify permissions.", {
            style: { background: "#393939", color: "#FFFFFF" },
          });
          navigate("/error-page");
          return;
        }

        const userData = data;
        if (!allowedRoles.includes(userData.role)) {
          await logBreachOnce();
          toast.error("Access denied.", {
            style: { background: "#393939", color: "#FFFFFF" },
          });
          navigate("/error-page");
          return;
        }

        setUser(userData);
      } catch (err: any) {
        console.error("Auth check failed:", err.response?.data || err.message);
        await logBreachOnce();
        toast.error("Unable to verify permissions.", {
          style: { background: "#393939", color: "#FFFFFF" },
        });
        navigate("/error-page");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [allowedRoles, navigate, pageLabel]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-zinc-900">
        <span className="text-gray-200 text-xl">Checking permissions...</span>
      </div>
    );
  }

  if (!user) return null; // guard

  return <>{children}</>;
}
