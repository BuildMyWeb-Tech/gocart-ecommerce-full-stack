import React from 'react'
import Title from './Title'
import { ourSpecsData } from '@/assets/assets'

const OurSpecs = () => {
    // Enhanced e-commerce focused specifications data
    const enhancedSpecsData = [
        ...ourSpecsData,
        {
            title: "Secure Payments",
            description: "Multiple payment options with advanced encryption to keep your financial information safe and secure.",
            icon: ourSpecsData[0].icon, // Using existing icon as placeholder
            accent: "#4F46E5" // Indigo
        },
        {
            title: "Easy Returns",
            description: "Hassle-free 30-day return policy for all products with quick refund processing.",
            icon: ourSpecsData[1].icon, // Using existing icon as placeholder
            accent: "#0EA5E9" // Sky blue
        },
        {
            title: "24/7 Support",
            description: "Our customer service team is available around the clock to assist with any questions or concerns.",
            icon: ourSpecsData[2].icon, // Using existing icon as placeholder
            accent: "#14B8A6" // Teal
        }
    ];

    return (
        <div className='px-6 my-20 max-w-6xl mx-auto'>
            <Title 
                visibleButton={false} 
                title='Why Shop With Us' 
                description="We've built our platform with your needs in mind, combining convenience, security, and exceptional service to deliver the best online shopping experience." 
            />

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 gap-y-16 mt-26'>
                {
                    enhancedSpecsData.map((spec, index) => {
                        return (
                            <div 
                                className='relative h-48 px-8 flex flex-col items-center justify-center w-full text-center rounded-xl group shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden' 
                                style={{ 
                                    background: `linear-gradient(145deg, ${spec.accent}05, ${spec.accent}15)`,
                                    borderLeft: `3px solid ${spec.accent}` 
                                }} 
                                key={index}
                            >
                                {/* Decorative background element */}
                                <div 
                                    className="absolute -right-10 -bottom-10 rounded-full opacity-10 transition-transform duration-300 group-hover:scale-110" 
                                    style={{ 
                                        backgroundColor: spec.accent,
                                        width: '140px',
                                        height: '140px'
                                    }}
                                ></div>

                                <h3 className='text-slate-800 font-semibold text-lg relative z-10'>{spec.title}</h3>
                                <p className='text-sm text-slate-600 mt-3 relative z-10 max-w-xs'>{spec.description}</p>
                                
                                <div 
                                    className='absolute -top-7 text-white size-14 flex items-center justify-center rounded-xl group-hover:scale-110 transition-all duration-300 shadow-md' 
                                    style={{ 
                                        backgroundColor: spec.accent,
                                        transform: 'rotate(0deg)',
                                    }}
                                >
                                    <spec.icon size={24} />
                                </div>
                                
                                {/* Hover effect line */}
                                <div 
                                    className="absolute bottom-0 left-0 w-0 h-1 group-hover:w-full transition-all duration-500" 
                                    style={{ backgroundColor: spec.accent }}
                                ></div>
                            </div>
                        )
                    })
                }
            </div>

            {/* Added E-commerce Testimonial/Trust Section */}
            <div className="mt-16 p-8 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 shadow-md">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-slate-800 mb-4">Trusted by Shoppers Worldwide</h3>
                        <p className="text-slate-600 mb-4">Join thousands of satisfied customers who make us their preferred shopping destination. Our platform processes over 10,000 secure transactions daily with a 99.8% satisfaction rate.</p>
                        <div className="flex gap-4 mt-6">
                            <div className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm">
                                <span className="font-bold text-2xl text-slate-800">99.8%</span>
                                <span className="text-xs text-slate-500">Satisfaction</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm">
                                <span className="font-bold text-2xl text-slate-800">10k+</span>
                                <span className="text-xs text-slate-500">Daily Orders</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm">
                                <span className="font-bold text-2xl text-slate-800">150+</span>
                                <span className="text-xs text-slate-500">Countries</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="grid grid-cols-3 gap-3">
                            {['Visa', 'Mastercard', 'PayPal', 'Apple Pay', 'Google Pay', 'Amazon Pay'].map((payment, i) => (
                                <div key={i} className="bg-white p-2 rounded-md shadow-sm flex items-center justify-center">
                                    <span className="text-xs font-medium text-slate-700">{payment}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OurSpecs
