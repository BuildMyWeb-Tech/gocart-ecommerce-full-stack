'use client'
import Link from "next/link";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Headphones, 
  Smartphone, 
  Laptop, 
  ShoppingBag, 
  Home, 
  Shield, 
  Crown, 
  Store
} from "lucide-react";

const Footer = () => {
    const linkSections = [
        {
            title: "SHOP BY CATEGORY",
            links: [
                { text: "Electronics & Gadgets", path: '/', icon: <Headphones size={16} className="text-blue-500" /> },
                { text: "Fashion & Apparel", path: '/', icon: <ShoppingBag size={16} className="text-blue-500" /> },
                { text: "Mobile Devices", path: '/', icon: <Smartphone size={16} className="text-blue-500" /> },
                { text: "Computing", path: '/', icon: <Laptop size={16} className="text-blue-500" /> },
            ]
        },
        {
            title: "CUSTOMER SERVICES",
            links: [
                { text: "Homepage", path: '/', icon: <Home size={16} className="text-blue-500" /> },
                { text: "Privacy & Terms", path: '/', icon: <Shield size={16} className="text-blue-500" /> },
                { text: "Premium Membership", path: '/pricing', icon: <Crown size={16} className="text-blue-500" /> },
                { text: "Start Selling", path: '/create-store', icon: <Store size={16} className="text-blue-500" /> },
            ]
        },
        {
            title: "GET IN TOUCH",
            links: [
                { text: "+1-888-555-0123", path: 'tel:+18885550123', icon: <Phone size={16} className="text-blue-500" /> },
                { text: "support@gocart.com", path: 'mailto:support@gocart.com', icon: <Mail size={16} className="text-blue-500" /> },
                { text: "500 Market Street, Suite 300, San Francisco, CA 94104", path: 'https://maps.google.com', icon: <MapPin size={16} className="text-blue-500" /> }
            ]
        }
    ];

    const socialIcons = [
        { icon: Facebook, link: "https://www.facebook.com", color: "#4267B2" },
        { icon: Instagram, link: "https://www.instagram.com", color: "#C13584" },
        { icon: Twitter, link: "https://twitter.com", color: "#1DA1F2" },
        { icon: Linkedin, link: "https://www.linkedin.com", color: "#0077B5" },
    ]

    return (
        <footer className="mx-6 bg-white">
            <div className="max-w-7xl mx-auto">
                

                <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-slate-500/30 text-slate-500">
                    <div className="md:max-w-xs lg:max-w-sm">
                        <Link href="/" className="text-4xl font-bold text-slate-800 flex items-center">
                            <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 rounded-lg mr-1">go</span>
                            <span>cart</span>
                            <span className="text-blue-500 text-5xl leading-0">.</span>
                        </Link>

                        <p className="mt-6 text-sm leading-relaxed">
                            Welcome to <strong>gocart</strong>, your premier destination for online shopping. We offer a vast selection of products ranging from electronics and fashion to home goods and more. With secure payments, fast delivery, and exceptional customer service, we're committed to making your shopping experience enjoyable and hassle-free.
                        </p>
                        
                        <div className="flex items-center gap-3 mt-6">
                            {socialIcons.map((item, i) => (
                                <Link href={item.link} key={i} 
                                    className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 bg-white shadow-sm border border-slate-100 hover:shadow-md hover:translate-y-[-3px]"
                                    style={{ backgroundColor: `${item.color}10` }} // 10% opacity version of the brand color
                                >
                                    <item.icon size={18} color={item.color} />
                                </Link>
                            ))}
                        </div>

                        {/* Payment Methods */}
                        {/* <div className="mt-8">
                            <p className="text-xs font-medium text-slate-500 mb-2">SECURE PAYMENT METHODS</p>
                            <div className="flex flex-wrap gap-2">
                                {['visa', 'mastercard', 'paypal', 'apple-pay', 'google-pay'].map(method => (
                                    <div key={method} className="bg-slate-50 px-3 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-700">
                                        {method.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </div>
                                ))}
                            </div>
                        </div> */}
                    </div>

                    <div className="flex flex-wrap justify-between w-full md:w-[55%] lg:w-[50%] gap-8 text-sm">
                        {linkSections.map((section, index) => (
                            <div key={index} className="min-w-[170px]">
                                <h3 className="font-bold text-slate-800 md:mb-6 mb-4 tracking-wide text-sm">{section.title}</h3>
                                <ul className="space-y-3.5">
                                    {section.links.map((link, i) => (
                                        <li key={i} className="flex items-center gap-2.5 group">
                                            {link.icon}
                                            <Link 
                                                href={link.path} 
                                                className="hover:text-blue-600 transition-colors duration-200 group-hover:translate-x-1 inline-block transform"
                                            >
                                                {link.text}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="py-6 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
                    <p>
                        &copy; {new Date().getFullYear()} gocart. All Rights Reserved.
                    </p>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <Link href="/" className="hover:text-blue-600 transition-colors duration-200">Terms of Service</Link>
                        <Link href="/" className="hover:text-blue-600 transition-colors duration-200">Privacy Policy</Link>
                        <Link href="/" className="hover:text-blue-600 transition-colors duration-200">Sitemap</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
