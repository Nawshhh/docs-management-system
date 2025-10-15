import LogsTable from "../components/LogsTable"
import { useNavigate } from "react-router-dom"

function Logs() {

    const navigate = useNavigate();

    const handleHome = () => {
        navigate("/admin-homepage")
    }

  return (
    <div className='w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10'>
        <p className='font-semibold text-3xl text-gray-200 mb-10'>Audit Logs</p>
        <LogsTable />
        <button 
            onClick={handleHome}
            className='mt-5 h-8 px-10 bg-neutral-700 hover:bg-neutral-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
        >Back to Home</button>
    </div>
  )
}

export default Logs