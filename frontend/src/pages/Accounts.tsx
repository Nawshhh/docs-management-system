import AccountsTable from '../components/AccountsTable'
import { useNavigate } from 'react-router-dom'

function Accounts() {
    
  const navigate = useNavigate();
  const handleHome = () => {
    navigate("/admin-homepage");
  }

  return (
    <div className='w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10'>
        <p className='font-semibold text-3xl text-gray-200 mb-10'>Accounts</p>
        <AccountsTable />
        <div className='flex justify-between items-center w-full'>
        <button 
            onClick={handleHome}
            className='mt-5 h-8 px-10 bg-sky-700 hover:bg-sky-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
        >Back to Home</button>
        <button 
            className='mt-5 h-8 px-10 bg-sky-700 hover:bg-sky-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
        >Create Account</button>
        </div>
        
    </div>
  )
}

export default Accounts