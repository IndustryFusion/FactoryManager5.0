import '@/styles/navbar.css'
import HorizontalNavbar from './horizontal-navbar'

type NavbarProps={
    navHeader?:string
  }

const Navbar:React.FC<NavbarProps> =({ navHeader})=>{
    return(
        <div className="flex gap-3 align-items-center factory-navbar justify-content-between">
          <div className="flex align-items-center">
            <div>
              <h2 className="nav-header ">{navHeader}</h2>
            </div>
            </div>
            <div>
                <HorizontalNavbar />
            </div>
        </div>
    )
}
export default Navbar;