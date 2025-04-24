interface ProgressStepsProps {
    currentStep: number;
  }
  
  export default function ProgressSteps({ currentStep }: ProgressStepsProps) {
    return (
      <div className="relative max-w-lg mx-auto px-8 mb-10">
        {/* The dots are positioned absolutely, so we'll move them up more */}
        <div className="absolute top-0 left-0 w-full flex justify-between -mt-4 px-8">
          <div 
            className={`w-4 h-4 rounded-full ${
              currentStep >= 1 ? 'bg-primary' : 'bg-secondary border-2 border-background'
            }`}
          ></div>
          <div 
            className={`w-4 h-4 rounded-full ${
              currentStep >= 2 ? 'bg-primary' : 'bg-secondary border-2 border-background'
            }`}
          ></div>
          <div 
            className={`w-4 h-4 rounded-full ${
              currentStep >= 3 ? 'bg-primary' : 'bg-secondary border-2 border-background'
            }`}
          ></div>
        </div>
        
        {/* Added more margin to text labels and moved them below the dots */}
        <div className="flex justify-between mb-2 mt-3">
          <div className="text-sm">Information</div>
          <div className="text-sm">License & Images</div>
          <div className="text-sm">Upload</div>
        </div>
        
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all" 
            style={{ width: `${(currentStep / 3) * 100}%` }}
          ></div>
        </div>
      </div>
    );
  }