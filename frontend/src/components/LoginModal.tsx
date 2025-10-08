
function LoginModal() {

  const formSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
  }

  return (
    <div className='h-auto w-auto py-8 px-8 rounded-md flex flex-col items-center justify-center'>
      <div className='grid-rows-2 gap-x-8 w-full h-full mb-8'>
        <div className="w-full flex flex-col text-center mb-4 text-gray-200 text-3xl font-bold">D M S</div>
        <div className='flex flex-col gap-y-2 mb-4 w-xs'>
          <span className=' text-gray-200'>Username</span>
          <input type="text" className=' rounded-md p-1 px-2 border-1 border-neutral-500 text-gray-200 font-light'/>
        </div>
        <div className='flex flex-col gap-y-2'>
          <span className=' text-gray-200'>Password</span>
          <input type="text" className='rounded-md p-1 px-2 border-1 border-neutral-500 text-gray-200 '/>
        </div>
      </div>
      <button className='h-8 px-10 bg-sky-700 hover:bg-sky-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'>Log In</button>
    </div>
  )
}

export default LoginModal