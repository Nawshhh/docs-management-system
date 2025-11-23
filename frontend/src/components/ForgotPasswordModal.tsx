import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

function ForgotPasswordModal() {

    const [nickName, setNickName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [foundEmail, setFoundEmail] = useState<boolean>(false);
    const [matchedNickname, setMatchedNickname] = useState<boolean>(false);
    const [newPassword, setNewPassword] = useState<string>("");
    const [changeError, setChangeError] = useState<string | null>(null);
    const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

    const navigate = useNavigate();

    const handleHome = () => {
        navigate("/");
    }

    const newPasswordChecks = {
        length: newPassword.length >= 7,
        number: /\d/.test(newPassword),
        special: /[^A-Za-z0-9]/.test(newPassword),
        max_length: newPassword.length <= 20
    };

    const isNewPasswordValid = Object.values(newPasswordChecks).every(Boolean);


    const [isLocked, setIsLocked] = useState(false);
    const [lockMessage, setLockMessage] = useState<string | null>(null);

    const [notFoundEmailMessage, setNotFoundEmailMessage] = useState<string | null>(null);


    const handleFindEmail = async () => {
        try {
            const res = await axios.post("http://localhost:8000/users/find-by-email",
                { email }
            );
            if (!res.data.ok){
                setFoundEmail(false);
                if (res.data.error == "User not found") {
                    setNotFoundEmailMessage("Email not found.");
                }
            }
            else {
                setFoundEmail(true);
            }
        } catch (error: any) {
            // console.log("Error finding email:", error.response?.data || error.message);
        } 
    }

    const handleVerifyNickname = async () => {
    if (isLocked) return; // already locked, do nothing

    try {
        const res = await axios.post(
        "http://localhost:8000/users/find-nickname",
        { email, security_answer: nickName } // plus security_answer if your backend needs it
        );

        // console.log("Find nickname message:", res.data, email, nickName);

        const { ok, error } = res.data;

        if (!ok) {
        // Check if this is the server-side lockout message
        if (error && error.startsWith("Too many attempts")) {
            setIsLocked(true);
            setLockMessage(error); // e.g. "Too many attempts. Try again in 50 seconds."
        } else {
            setMatchedNickname(false);
            setLockMessage(error || "Incorrect nickname.");
        }
        return;
        }

        // success: nickname matched
        setMatchedNickname(true);
        setLockMessage(null);
    } catch (error: any) {
        const serverError = error.response?.data?.error as string | undefined;

        // If backend throws lockout from exception path
        if (serverError && serverError.startsWith("Too many attempts")) {
        setIsLocked(true);
        setLockMessage(serverError);
        } else {
        // console.log("Error matching nickname:", error.response?.data || error.message);
        setLockMessage("Something went wrong. Please try again.");
        }
    }
    };


    const handleChangePassword = async () => {
    try {
        setChangeError(null);

        const userRes = await axios.post(
        "http://localhost:8000/users/get-user-by-email",
        { email }
        );

        const userId = userRes.data.data; // backend returns just the id string

        const res = await axios.post(
        "http://localhost:8000/users/reset-password",
        { user_id: userId, new_password: newPassword }
        );

        // console.log("Change password message:", res.data);

        if (!res.data.ok) {
            // console.log("Password change failed:", res.data.remaining_seconds);
        // if backend sends remaining_seconds, start cooldown
            if (typeof res.data.remaining_seconds === "number") {
                setCooldownSeconds(res.data.remaining_seconds);
            }
            setChangeError(res.data.error || "Could not change password.");
            return;
        }

        toast.success("Password changed successfully.");
        setNewPassword("");
        setCooldownSeconds(null);
        navigate("/");
    } catch (error: any) {
        const serverData = error.response?.data;
        const serverErr = serverData?.error as string | undefined;
        const remaining = serverData?.remaining_seconds;

        if (typeof remaining === "number") {
        setCooldownSeconds(remaining);
        }

        setChangeError(serverErr || "Something went wrong. Please try again.");
    }
    };


    const handleBackToLogin = () => {
        navigate("/");
    }

    useEffect(() => {
    if (cooldownSeconds === null) return;

    if (cooldownSeconds <= 0) {
        setCooldownSeconds(null);
        return;
    }

    const timer = setInterval(() => {
        setCooldownSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) return null;
        return prev - 1;
        });
    }, 1000);

    return () => clearInterval(timer);
    }, [cooldownSeconds]);

    const formatCooldown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

  return (
    <div className='h-auto w-auto py-8 px-8 rounded-md flex flex-col items-center justify-center'>
      <div className='grid-rows-2 gap-x-8 w-full h-full mb-8'>
        <div className="w-full flex flex-col text-center mb-4 text-gray-200 text-3xl font-bold">Forgot Password</div>
            {/*Container of modal*/}
            {!foundEmail ? ( 
            <div className='flex flex-col gap-y-2 mb-4 w-xs'>
                <span className=' text-gray-200'>Email</span>
                <input
                    type="text" 
                    className='rounded-md p-1 px-2 border-1 border-neutral-500 text-gray-200 font-light'
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}/>
                    
                <div className="flex flex-row gap-x-2 w-full">
                    <button
                        onClick={handleBackToLogin}
                        className="h-10 flex-1 bg-neutral-700 hover:bg-neutral-600 rounded-md 
                                text-gray-200 hover:text-gray-300 text-sm cursor-pointer"
                    >
                        Back to Log In
                    </button>
                    <button
                        onClick={handleFindEmail}
                        className="h-10 flex-1 bg-sky-700 hover:bg-sky-600 rounded-md 
                                text-gray-200 hover:text-gray-300 text-sm cursor-pointer"
                    >
                        Find Email
                    </button>
                </div>
                {!foundEmail && (
                    <p className="text-red-400 text-xs mt-1">{notFoundEmailMessage}</p>
                )}
            </div>) : !matchedNickname ? (
            <div className='flex flex-col gap-y-2 mb-4 w-xs'>
                <span className=' text-gray-200'>Security Question: What is your nickname?</span>
                <input
                    type="text" 
                    className='rounded-md p-1 px-2 border-1 border-neutral-500 text-gray-200 font-light'
                    name="nickname"
                    value={nickName}
                    onChange={(e) => setNickName(e.target.value)}/>
                <div className="flex flex-row gap-x-2 w-full">
                    <button
                        onClick={handleBackToLogin}
                        className="h-10 flex-1 bg-neutral-700 hover:bg-neutral-600 rounded-md 
                                text-gray-200 hover:text-gray-300 text-sm cursor-pointer"
                    >
                        Back to Log In
                    </button>

                    <button
                        disabled={isLocked}
                        onClick={handleVerifyNickname}
                        className="h-10 flex-1 bg-sky-700 hover:bg-sky-600 rounded-md 
                                text-gray-200 hover:text-gray-300 text-sm cursor-pointer"
                    >
                        Verify
                    </button>
                </div>
                {lockMessage && (
                    <p className="text-red-400 text-xs mt-1">{lockMessage}</p>
                )}
            </div>
            ) : (
                <div className='flex flex-col gap-y-2 mb-4 w-xs'>
                    <span className='text-gray-200'>Enter new password</span>
                    <input
                    type="password"
                    className='rounded-md p-1 px-2 border-1 border-neutral-500 text-gray-200 font-light'
                    name="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    />

                    {/* Live password rules */}
                    <div className="mt-2 text-xs space-y-1">
                        <div className={!newPasswordChecks.max_length ? "text-gray-400" : "text-green-400"}>
                            {newPasswordChecks.length ? "✓" : "•"} No more than 20 characters
                        </div>
                        <div className={newPasswordChecks.length ? "text-green-400" : "text-gray-400"}>
                            {newPasswordChecks.length ? "✓" : "•"} At least 7 characters
                        </div>
                        <div className={newPasswordChecks.number ? "text-green-400" : "text-gray-400"}>
                            {newPasswordChecks.number ? "✓" : "•"} At least one number
                        </div>
                        <div className={newPasswordChecks.special ? "text-green-400" : "text-gray-400"}>
                            {newPasswordChecks.special ? "✓" : "•"} At least one special character
                        </div>
                    </div>


                    {(changeError == "New password was used recently. Please choose a different one.") && (
                        <>
                            <p className="text-red-400 text-xs mt-1">{changeError}</p>
                        </>
                    )}

                    {(changeError?.includes("hours")) && (
                        <>
                            <p className="text-red-400 text-xs mt-1">{changeError}</p>
                            <button 
                                onClick={handleHome}
                                className='mt-5 h-8 px-10 bg-neutral-700 hover:bg-neutral-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
                            >Back to Login</button>
                        </>
                    )}


                    {cooldownSeconds !== null && (
                        <p className="text-yellow-400 text-xs mt-1">
                            You can change your password again in {formatCooldown(cooldownSeconds)}.
                        </p>
                    )}

                    <button 
                        onClick={handleChangePassword}  // if you have a handler
                        disabled={!isNewPasswordValid}
                        className={`h-8 px-10 rounded-md text-gray-200 text-sm cursor-pointer
                            ${!isNewPasswordValid
                            ? "bg-sky-900 text-gray-400 cursor-not-allowed"
                            : "bg-sky-700 hover:bg-sky-600 hover:text-gray-300"
                            }`}
                        >
                    Change</button>
                </div>
            )}
        </div>
    </div>
  )
}

export default ForgotPasswordModal