import Navbar from './Navbar';
import Footer from './Footer';
import {PropsWithChildren} from "react";

const Layout = ({ children }: PropsWithChildren<{}>) => {
    return (
        <div className="app">
            <Navbar />
            <main className="main">
                {children}
            </main>
            <Footer />
        </div>
    )
}

export default Layout;
