import React from 'react'
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';


function CreateAccount() {

    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "EMPLOYEE",
    });

    // Fetch user info on component mount
    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.log("No token found — user probably logged out");
            toast.error("No Permission!", {
                    style: {
                        background: "#393939",
                        color: "#FFFFFF"
                    }
                }
            );
            navigate("/");
        }

        try {
            const res = await axios.get("http://localhost:8000/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
            });
            console.log("User info fetched:", res.data.data);
            setUser(res.data.data);
        } catch (error: any) {
            console.error("User info failed:", error.response?.data || error.message);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
        ...formData,
        [e.target.name]: e.target.value,
        });
    };

    const apiBuilder = (role: string): string => {
    if (role === "ADMIN") return "http://localhost:8000/users/admins";
    else if (role === "MANAGER") return "http://localhost:8000/users/managers";
    else if (role === "EMPLOYEE") return "http://localhost:8000/users/employee";
    else return "http://localhost:8000/users"; // default or fallback
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const apiString = apiBuilder(formData.role);

            const token = localStorage.getItem("token"); // optional if route needs auth
            const res = await axios.post( apiString,
                { 
                    email: formData.email,
                    first_name : formData.first_name,
                    last_name : formData.last_name,  
                    password : formData.password,
                },
                {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
                }
            );

            console.log("Create user success:", res.data);
            toast.success("Account created successfully!");
            setFormData({
                first_name: "",
                last_name: "",
                email: "",
                password: "",
                role: "EMPLOYEE",
            });

            // go back to accounts view
            handleCancel();
        } catch (error: any) {
            console.error("Error creating account:", error.response?.data || error.message);
            toast.error("Failed to create account.");
        }
    }

    const handleCancel = () => {
        navigate("/accounts");
    }

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
        <div className='text-gray-200 text-3xl font-bold'>
            Create Account
        </div>
        <form 
            onSubmit={handleCreateAccount}
            className="mt-10 w-full max-w-md bg-zinc-800 rounded-lg shadow-lg p-8 flex flex-col gap-5">
            {/* First + Last Name */}
            <div className="flex gap-4">
                <div className="flex-1 flex flex-col">
                <label className="text-gray-300 text-sm mb-1">First Name</label>
                <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className="rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
                </div>
                <div className="flex-1 flex flex-col">
                <label className="text-gray-300 text-sm mb-1">Last Name</label>
                <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className="rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
                </div>
            </div>

            {/* Email */}
            <div className="flex flex-col">
                <label className="text-gray-300 text-sm mb-1">Email</label>
                <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                className="rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
            </div>

            {/* Password */}
            <div className="flex flex-col">
                <label className="text-gray-300 text-sm mb-1">Password</label>
                <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                className="rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
            </div>

            {/* Role Selection */}
            <div className="flex flex-col">
                <label className="text-gray-300 text-sm mb-1">Role</label>
                <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="EMPLOYEE">Employee</option>
                </select>
            </div>

            {/* Submit and Cancel Button */}
            <button
                type="submit"
                className="mt-4 bg-sky-700 hover:bg-sky-600 text-white font-semibold py-2 rounded-md transition-colors"
            >
                Create
            </button>
            <button
                type="button"
                onClick={handleCancel}
                className=" bg-neutral-700 hover:bg-neutral-600 text-white font-semibold py-2 rounded-md transition-colors"
            >
                Cancel
            </button>
        </form>
    </div>
  )
}

export default CreateAccount