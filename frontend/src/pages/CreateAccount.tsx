import React from 'react'
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';


function CreateAccount() {

  const maxLen = 20;

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    secuirty_answer: "", // note: still spelled this way in your state
    manager_id: "",
  });

  // const [managerList, setManagerList] = useState<Array<{_id: string, email: string}>>([]);

  const password = formData.password || "";

  const passwordChecks = {
    length: password.length >= 7,
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    max_length: password.length <= 20,
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  // all required fields filled
  const areRequiredFieldsFilled =
    formData.first_name.trim().length > 0 &&
    formData.first_name.trim().length <= maxLen &&
    formData.last_name.trim().length > 0 &&
    formData.last_name.trim().length <= maxLen &&
    formData.email.trim().length > 0 &&
    formData.secuirty_answer.trim().length > 0 &&
    formData.secuirty_answer.trim().length <= maxLen;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    // block submit if any required field is missing
    if (!areRequiredFieldsFilled) {
      toast.error("Please fill in all fields correctly.", {
        style: {
          background: "#393939",
          color: "#FFFFFF",
        },
      });
      return;
    }

    // block submit if password invalid
    if (!isPasswordValid) {
      toast.error("Please enter a valid password.", {
        style: {
          background: "#393939",
          color: "#FFFFFF",
        },
      });
      return;
    }

    if (formData.first_name.length > maxLen ||
        formData.last_name.length > maxLen ||
        formData.secuirty_answer.length > maxLen) {
      toast.error("First name, last name, and nickname must be at most 15 characters.", {
        style: { background: "#393939", color: "#FFFFFF" },
      });
      return;
    }

    try {
      const res = await axios.post("http://localhost:8000/users/employee", {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        security_answer: formData.secuirty_answer, // backend uses `security_answer`
        manager_id: formData.manager_id
      });

      // console.log("Create user success:", res.data.ok);

      if (!res.data.ok){
        toast.error(res.data.error || "Invalid");
        return
      }

      toast.success("Account created successfully!");
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "EMPLOYEE",
        secuirty_answer: "",
        manager_id: ""
      });

      handleCancel();
    } catch (error: any) {
      toast.error("Failed to create account.");
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
      <div className="text-gray-200 text-3xl font-bold">Create Account</div>
      <form
        onSubmit={handleCreateAccount}
        className="mt-10 w-full max-w-md bg-zinc-800 rounded-lg shadow-lg p-8 flex flex-col gap-5"
      >
        {/* First + Last Name */}
        <div className="flex gap-4 w-full">
          <div className="flex-1 flex flex-col">
            <label className="text-gray-300 text-sm mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Enter first name"
              className="w-full rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
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
              className="w-full rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
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

          {/* password rules */}
          <div className="mt-2 text-xs space-y-1">
            <div className={passwordChecks.max_length ? "text-gray-400" : "text-red-400"}>
              {passwordChecks.max_length ? "•" : "x"} No more than 20 characters
            </div>
            <div className={passwordChecks.length ? "text-green-400" : "text-gray-400"}>
              {passwordChecks.length ? "✓" : "•"} At least 7 characters
            </div>
            <div className={passwordChecks.number ? "text-green-400" : "text-gray-400"}>
              {passwordChecks.number ? "✓" : "•"} At least one number
            </div>
            <div className={passwordChecks.special ? "text-green-400" : "text-gray-400"}>
              {passwordChecks.special ? "✓" : "•"} At least one special character
            </div>
          </div>
        </div>


        {/* <div className="flex flex-col">
          <label className="text-gray-300 text-sm mb-1">Select Manager</label>
          <select
            name="role"
            value={formData.role}
            disabled={false}
            onChange={handleChange}
            className="rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
          >
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </div> */}

        {/* Security Question */}
        <div className="flex flex-col">
          <label className="text-gray-300 text-sm mb-1">
            Security Question: What is your nickname?
          </label>
          <input
            type="text"
            name="secuirty_answer"
            value={formData.secuirty_answer}
            onChange={handleChange}
            placeholder="Enter security answer"
            className="rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>

        {/* Submit and Cancel Button */}
        <button
          type="submit"
          disabled={!areRequiredFieldsFilled || !isPasswordValid}
          className={`mt-4 font-semibold py-2 rounded-md transition-colors
            ${
              !areRequiredFieldsFilled || !isPasswordValid
                ? "bg-sky-900 text-gray-400 cursor-not-allowed"
                : "bg-sky-700 hover:bg-sky-600 text-white"
            }`}
        >
          Create
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="bg-neutral-700 hover:bg-neutral-600 text-white font-semibold py-2 rounded-md transition-colors"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}


export default CreateAccount