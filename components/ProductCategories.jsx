'use client'
import React, { useState, useEffect, useRef } from 'react'
import Title from './Title'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { 
  ChevronRight, ChevronLeft, ShoppingBag, Smartphone, Tv, Headphones, 
  Watch, Shirt, Home, Laptop, BookOpen
} from 'lucide-react'
import Link from 'next/link'
import { assets } from '@/assets/assets'



const ProductCategories = () => {
  
const categoryData = [
    {
        id: 1,
        name: "Electronics",
        description: "Latest gadgets and electronic devices",
        image: assets.Img1,    
        icon: Tv,
        accent: "#3B82F6",
        link: "/category/electronics"
    },
    {
        id: 2,
        name: "Fashion",
        description: "Trendy clothing and accessories",
        image: assets.Img2,   
        icon: Shirt,
        accent: "#EC4899",
        link: "/category/fashion"
    },
    {
        id: 3,
        name: "Home & Kitchen",
        description: "Essential items for your home",
        image: assets.Img3,
        icon: Home,
        accent: "#10B981",
        link: "/category/home-kitchen"
    },
    {
        id: 4,
        name: "T-Shirts",
        description: "Cool and trendy T-shirts",
        image: assets.Img4,
        icon: Shirt,
        accent: "#4B5563",
        link: "/category/tshirts"
    },
    {
        id: 5,
        name: "Shoes",
        description: "Latest sneaker designs",
        image: assets.Img5,
        icon: ShoppingBag,
        accent: "#EF4444",
        link: "/category/shoes"
    },
    {
        id: 6,
        name: "Fashion",
        description: "Trendy clothing and accessories",
        image: assets.Img2,   
        icon: Shirt,
        accent: "#EC4899",
        link: "/category/fashion"
    }
    
];
    
    const [activeCategory, setActiveCategory] = useState(null)
    const [windowWidth, setWindowWidth] = useState(null)
    const carouselRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [scrollLeft, setScrollLeft] = useState(0)
    const [autoScroll, setAutoScroll] = useState(false)
    const [animateOnScroll, setAnimateOnScroll] = useState([])
    
    const shouldAutoScroll = () => {
        if (!windowWidth) return false
        if (categoryData.length <= 3) return false
        
        if (windowWidth < 640 && categoryData.length > 2) return true
        if (windowWidth >= 640 && windowWidth < 1024 && categoryData.length > 3) return true
        if (windowWidth >= 1024 && categoryData.length > 4) return true
        
        return false
    }
    
    useEffect(() => {
        setWindowWidth(window.innerWidth)
        
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        
        return () => window.removeEventListener('resize', handleResize)
    }, [])
    
    useEffect(() => {
        setAutoScroll(shouldAutoScroll())
    }, [windowWidth, categoryData.length])
    
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setAnimateOnScroll(prev => [...prev, parseInt(entry.target.dataset.index)])
                    }
                })
            },
            { threshold: 0.1 }
        )

        document.querySelectorAll('.category-card').forEach(card => {
            observer.observe(card)
        })

        return () => observer.disconnect()
    }, [])
    
    useEffect(() => {
        let interval
        
        if (autoScroll && !isDragging && carouselRef.current) {
            interval = setInterval(() => {
                carouselRef.current.scrollLeft += 1
                if (
                    carouselRef.current.scrollLeft >=
                    carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 10
                ) {
                    carouselRef.current.scrollLeft = 0
                }
            }, 30)
        }
        
        return () => clearInterval(interval)
    }, [autoScroll, isDragging])
    
    const handleMouseDown = (e) => {
        setIsDragging(true)
        setStartX(e.pageX - carouselRef.current.offsetLeft)
        setScrollLeft(carouselRef.current.scrollLeft)
    }
    
    const handleMouseLeave = () => setIsDragging(false)
    const handleMouseUp = () => setIsDragging(false)
    
    const handleMouseMove = (e) => {
        if (!isDragging) return
        e.preventDefault()
        const x = e.pageX - carouselRef.current.offsetLeft
        const walk = (x - startX) * 2
        carouselRef.current.scrollLeft = scrollLeft - walk
    }
    
    const scroll = (direction) => {
        if (carouselRef.current) {
            const scrollAmount = direction === 'left' ? -300 : 300
            carouselRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            })
        }
    }
    
    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    }

    return (
        <section className="py-16 md:py-24 bg-gradient-to-b from-white to-slate-50 overflow-hidden">

            {/* LOCAL CSS - NO GLOBAL CSS */}
            <style jsx>{`
                @keyframes progress {
                    0% { stroke-dashoffset: 301.5px; }
                    100% { stroke-dashoffset: 0; }
                }
                .animate-circle-progress {
                    animation: progress 1.5s ease-in-out forwards;
                }

                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-in-up {
                    animation: fadeInUp 0.5s ease-out forwards;
                }
            `}</style>

            <div className='container px-4 sm:px-6 mx-auto max-w-7xl relative'>
                
                {/* Decorative Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                    <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-green-100 blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-green-100 blur-3xl translate-x-1/3 translate-y-1/3"></div>
                </div>

                {/* Header */}
                <div className="text-center max-w-3xl mx-auto relative z-10 mb-5">
                    <span className="inline-block px-3 py-1 bg-gradient-to-r from-green-50 to-green-50 text-green-700 text-sm font-semibold rounded-full mb-3 border border-green-100">
                        BROWSE CATEGORIES
                    </span>

                    <Title 
                        visibleButton={false} 
                        title='Shop By Category' 
                        description="Explore our wide range of products organized into intuitive categories for easier shopping." 
                        className="mb-4"
                    />

                    <div className="w-20 h-1 bg-gradient-to-r from-green-500 to-green-500 mx-auto mt-5 rounded-full"></div>
                </div>

                {/* Carousel Section */}
                <div className="relative">
                    
                    {/* LEFT BUTTON */}
                    {autoScroll && (
                        <button 
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors focus:outline-none lg:-left-5 md:opacity-70 hover:opacity-100"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    
                    <div 
                        ref={carouselRef}
                        className={`
                            flex space-x-6  relative z-10 overflow-x-auto 
                            scrollbar-none scroll-smooth
                            ${autoScroll ? 'cursor-grab active:cursor-grabbing' : 'justify-center'}
                        `}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onMouseDown={autoScroll ? handleMouseDown : null}
                        onMouseLeave={autoScroll ? handleMouseLeave : null}
                        onMouseUp={autoScroll ? handleMouseUp : null}
                        onMouseMove={autoScroll ? handleMouseMove : null}
                    >
                        {categoryData.map((category, index) => (
                            <motion.div 
                                key={category.id}
                                className="category-card flex-shrink-0"
                                data-index={index}
                                initial="hidden"
                                animate={animateOnScroll.includes(index) ? "visible" : "hidden"}
                                variants={cardVariants}
                                whileHover={{ scale: 1.03 }}
                                onMouseEnter={() => setActiveCategory(index)}
                                onMouseLeave={() => setActiveCategory(null)}
                            >
                                <Link href={category.link} className="block">
                                    <div className="flex flex-col items-center group">

                                        {/* Image Circle */}
                                        <div 
                                            className="relative rounded-full overflow-hidden mb-4 border-4 shadow-md transition-all duration-300 group-hover:shadow-lg"
                                            style={{ 
                                                width: "180px", 
                                                height: "180px",
                                                borderColor: `${category.accent}20`
                                            }}
                                        >
                                            <Image
                                                src={category.image}
                                                alt={category.name}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            
                                            <div
                                                className={`
                                                    absolute inset-0 flex items-center justify-center 
                                                    opacity-70 transition-opacity duration-300
                                                    ${activeCategory === index ? 'opacity-30' : 'opacity-60'}
                                                `}
                                                style={{ background: `linear-gradient(to top, ${category.accent}CC, transparent)` }}
                                            >
                                                <category.icon 
                                                    size={48} 
                                                    className={`
                                                        text-white transform transition-transform duration-300
                                                        ${activeCategory === index ? 'scale-110' : 'scale-100'}
                                                    `}
                                                />
                                            </div>

                                            {activeCategory === index && (
                                                <svg 
                                                    className="absolute top-0 left-0 w-full h-full rotate-90 -z-10" 
                                                    viewBox="0 0 100 100"
                                                >
                                                    <circle
                                                        cx="50"
                                                        cy="50"
                                                        r="48"
                                                        fill="none"
                                                        stroke={category.accent}
                                                        strokeWidth="3"
                                                        strokeDasharray="301.5px"
                                                        strokeDashoffset="301.5px"
                                                        className="animate-circle-progress"
                                                    />
                                                </svg>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg font-medium text-slate-800 text-center mb-1 group-hover:text-green-600 transition-colors">
                                            {category.name}
                                        </h3>

                                        <p className="text-sm text-slate-500 text-center max-w-[180px] hidden sm:block">
                                            {category.description}
                                        </p>

                                        <div 
                                            className={`
                                                mt-3 inline-flex items-center justify-center text-xs font-medium
                                                transition-all duration-200 rounded-full px-3 py-1
                                                ${activeCategory === index 
                                                    ? 'opacity-100 bg-green-50 text-green-600' 
                                                    : 'opacity-0 bg-transparent text-transparent'
                                                }
                                            `}
                                        >
                                            View Products <ChevronRight size={14} className="ml-1" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* RIGHT BUTTON */}
                    {autoScroll && (
                        <button 
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors focus:outline-none lg:-right-5 md:opacity-70 hover:opacity-100"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>

                <div className="text-center mt-12">
                    <Link 
                        href="/categories" 
                        className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm hover:shadow-md"
                    >
                        <ShoppingBag size={18} className="mr-2" />
                        View All Categories
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default ProductCategories
