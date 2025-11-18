import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

interface UserProfile {
  first_name: string;
  last_name?: string;
}

interface Manager {
  _id: string;
  email: string;
  role: Role;
  profile?: UserProfile;
}

interface Employee {
  _id: string;
  email: string;
  role: Role;
  profile?: UserProfile;
  manager_id?: string | null;
}

function AssignScope() {
  const navigate = useNavigate();

  const [managers, setManagers] = useState<Manager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScopeData();
  }, []);

  const fetchScopeData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("No permission. Please log in.", {
        style: { background: "#393939", color: "#FFFFFF" },
      });
      navigate("/");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch managers and unassigned employees in parallel
      const [mgrRes, empRes] = await Promise.all([
        axios.get("http://localhost:8000/users/get-managers", {
          headers,
          withCredentials: true,
        }),
        axios.get("http://localhost:8000/users/get-employees", {
          headers,
          withCredentials: true,
        }),
      ]);

      const mgrData: Manager[] = mgrRes.data?.data || [];
      const empData: Employee[] = empRes.data?.data || [];

      setManagers(mgrData);
      setEmployees(empData);
    } catch (error: any) {
      console.error("Error fetching scope data:", error.response?.data || error.message);
      toast.error("Failed to load scope data.", {
        style: { background: "#393939", color: "#FFFFFF" },
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

    const handleAssignManager = async (employeeId: string, managerId: string) => {
    if (!managerId) return;

    const token = localStorage.getItem("token");
    if (!token) {
        toast.error("No permission. Please log in.", {
        style: { background: "#393939", color: "#FFFFFF" },
        });
        navigate("/");
        return;
    }

    try {
        await axios.put(
        "http://localhost:8000/users/assign-manager",
        { employee_id: employeeId, manager_id: managerId },
        {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
        }
        );

        toast.success("Employee assigned to manager.", {
        style: { background: "#393939", color: "#FFFFFF" },
        });

        setEmployees(prev => prev.map(e => e._id === employeeId ? { ...e, manager_id: managerId } : e));
    } catch (error: any) {
        console.error("Error assigning manager:", error.response?.data || error.message);
        toast.error("Failed to assign manager.", {
        style: { background: "#393939", color: "#FFFFFF" },
        });
    }
    };

    const handleHome = () => {
        navigate("/admin-homepage");
    }


    if (loading) {
        return (
        <div className="w-screen h-screen flex items-center justify-center bg-zinc-900">
            <span className="text-gray-200 text-xl">Loading scope data...</span>
        </div>
        );
    }

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
      <div className="text-gray-200 text-3xl font-bold mb-4">
        Assign Employee Scope
      </div>

      {/* Managers list */}
      <div className="w-full max-w-4xl bg-zinc-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-gray-200 text-xl font-semibold mb-2">
          Managers
        </h2>
        {managers.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No managers found.
          </p>
        ) : (
          <p className="text-gray-200 text-sm">
            {managers
              .map((m) => {
                const first = m.profile?.first_name || "";
                const last = m.profile?.last_name || "";
                const fullName = `${first} ${last}`.trim() || m.email;
                return fullName;
              })
              .join(" · ")}
          </p>
        )}
      </div>

      {/* Unassigned employees table */}
    <div className="w-full max-w-4xl bg-zinc-800 rounded-lg shadow-lg p-6 flex flex-col">
    <h2 className="text-gray-200 text-xl font-semibold mb-4">
        Employees
    </h2>

    {employees.length === 0 ? (
        <p className="text-gray-400 text-sm">
        All employees are already assigned to a manager.
        </p>
    ) : (
        <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-200">
            <thead>
            <tr className="border-b border-zinc-700">
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Email</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Assign to Manager</th>
            </tr>
            </thead>
            <tbody>
            {employees.map((emp, idx) => {
                const first = emp.profile?.first_name || "";
                const last = emp.profile?.last_name || "";
                const fullName = `${first} ${last}`.trim() || emp.email;

            return (
            <tr
                key={emp._id || emp.email || idx}
                className="border-b border-zinc-700 hover:bg-zinc-700/40"
            >
                <td className="py-2 px-3">{fullName}</td>
                <td className="py-2 px-3">{emp.email}</td>
                <td className="py-2 px-3">
                {emp.role || "EMPLOYEE"}
                </td>
                <td className="py-2 px-3">
                <select
                    value={emp.manager_id || ""}            // reflect current manager_id or ""
                    onChange={(e) =>
                    handleAssignManager(emp._id, e.target.value)
                    }
                    className="bg-zinc-700 text-gray-100 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                    <option value="" disabled>
                    Select manager
                    </option>
                    {managers.map((m) => {
                    const mFirst = m.profile?.first_name || "";
                    const mLast = m.profile?.last_name || "";
                    const managerName =
                        `${mFirst} ${mLast}`.trim() || m.email;

                    return (
                        <option key={m._id} value={m._id}>
                        {managerName}
                        </option>
                    );
                    })}
                </select>
                </td>
            </tr>
            );

            })}
            </tbody>
        </table>
        </div>
    )}
    </div>

      <div className="mt-6">
            <button 
                onClick={handleHome}
                className='mt-5 h-8 px-10 bg-neutral-700 hover:bg-neutral-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
            >Back to Home</button>
      </div>
    </div>
  );
}

export default AssignScope;
