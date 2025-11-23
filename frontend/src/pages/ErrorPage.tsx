import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

function ErrorPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
        await axios.post("http://localhost:8000/auth/logout", 
        {}, 
        { withCredentials: true } 
        );

        // console.log('Logout successful:', response.data);

        toast.error("You have been logged out.");

        navigate("/");

    } catch (error: any) {
        navigate("/");
    } 
  };    

  const handleButtonClick = () => {
    handleLogout();
    navigate("/");
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
      <div className="text-gray-200 text-3xl font-bold">Oops...No Access! Go back shoo!</div>

        <button
          type="button"
          onClick={handleButtonClick}
          className="bg-neutral-700 mt-5 px-10 hover:bg-neutral-600 text-white font-semibold py-2 rounded-md transition-colors"
        >
          Bye Bye
        </button>
    </div>
  );
}


export default ErrorPage