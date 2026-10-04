const fs = require('fs');
let code = fs.readFileSync('next-app/src/components/staff/RecordsArchiveTab.js', 'utf8');

// Ensure framer-motion is imported
if (!code.includes('from "framer-motion"')) {
  code = code.replace(
    'import { useState, useEffect, useMemo } from "react"',
    'import { useState, useEffect, useMemo } from "react"\nimport { motion, useMotionValue, useTransform, useSpring } from "framer-motion"'
  );
}

const componentCode = `
function InteractiveMacFolder({ it, theme, updateFolderColor, folderColors }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), { stiffness: 280, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), { stiffness: 280, damping: 20 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(nx);
    mouseY.set(ny);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      onClick={it.disabled ? undefined : it.onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={\`group relative h-48 w-full min-w-[180px] max-w-[300px] \${ it.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer" }\`}
      style={{ 
        perspective: "1200px",
        rotateX,
        rotateY,
        transformStyle: "preserve-3d"
      }}
    >
      {/* Paint Palette Color Picker Button */}
      <div 
        className="absolute bottom-2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-fast" 
        onClick={(e) => e.stopPropagation()}
        style={{ transform: "translateZ(30px)" }}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 border border-black/10 shadow-xs transition-colors",
                theme.isLight ? "text-amber-950/80" : "text-white/80"
              )}
              title="Change Folder Color"
            >
              <HugeIcon  className="ph-bold ph-palette text-xs" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-2 rounded-xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl" side="top" align="end">
            <div className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 px-1 tracking-wider">Folder Color</div>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(FOLDER_COLORS).map(([colorKey, colorVal]) => (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => updateFolderColor(it.key, colorKey)}
                  className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 active:scale-95 transition-transform cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: colorVal.frontStart }}
                  title={colorVal.name}
                >
                  {(folderColors[it.key] === colorKey || (!folderColors[it.key] && colorKey === "yellow")) ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  ) : null}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* macOS Folder Back Flap */}
      <div 
        className="absolute top-[18px] left-0 right-0 bottom-0 rounded-2xl transition-all duration-normal"
        style={{
          background: \`linear-gradient(180deg, \${theme.backStart} 0%, \${theme.backEnd} 100%)\`,
          transform: "translateZ(-10px)"
        }}
      >
        {/* Folder Tab */}
        <div 
          className="absolute bottom-[calc(100%-1px)] left-[16px] w-20 h-4 rounded-t-[8px] z-0"
          style={{
            backgroundColor: theme.backStart
          }}
        />
      </div>

      {/* Solid Paper Peek Sheets */}
      <div 
        className="absolute top-[2px] left-[5%] right-[5%] bottom-[20px] z-10 flex flex-col justify-end transition-all duration-normal group-hover:translate-y-[-12px] group-hover:scale-[1.02]"
        style={{ transform: "translateZ(0px)" }}
      >
        {/* Back sheet */}
        <div className="absolute bottom-0 left-[6%] right-[6%] h-[56px] bg-white/70 rounded-t-md shadow-[0_-1px_3px_rgba(0,0,0,0.05)] border-t border-x border-gray-200/20 transform -rotate-3 origin-bottom transition-all duration-normal group-hover:rotate-[-6deg]" />
        
        {/* Middle sheet */}
        <div className="absolute bottom-0 left-[3%] right-[3%] h-[60px] bg-white/85 rounded-t-md shadow-[0_-1px_4px_rgba(0,0,0,0.05)] border-t border-x border-gray-200/30 transform rotate-2 origin-bottom transition-all duration-normal group-hover:rotate-[4deg]" />
        
        {/* Front sheet with mock content lines */}
        <div className="absolute bottom-0 left-0 right-0 h-[64px] bg-white rounded-t-md shadow-[0_-2px_6px_rgba(0,0,0,0.08)] border-t border-x border-gray-200 p-3 flex flex-col gap-1.5 transition-all duration-normal">
          <div className="h-1.5 w-1/3 bg-gray-300/60 rounded-full" />
          <div className="h-1 w-full bg-gray-200/50 rounded-full" />
          <div className="h-1 w-5/6 bg-gray-200/50 rounded-full" />
        </div>
      </div>

      {/* macOS Folder Front Body */}
      <div 
        className="absolute top-[28px] right-0 bottom-0 left-0 z-20 flex flex-col items-center justify-center rounded-2xl p-4 transition-all duration-normal origin-bottom group-hover:[transform:rotateX(-14deg)_translateY(2px)]"
        style={{
          background: \`linear-gradient(180deg, \${theme.frontStart} 0%, \${theme.frontEnd} 100%)\`,
          transformStyle: "preserve-3d",
          transform: "translateZ(10px)"
        }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none z-25" />
        
        <h3 
          className={cn(
            "w-full truncate px-1 text-center text-3xl font-black sm:text-4xl z-30 tracking-tight",
            theme.title
          )}
          style={{ transform: "translateZ(20px)" }}
        >
          {it.title}
        </h3>
        <span 
          className={cn(
            "mt-1 text-xs font-bold tracking-widest z-30 uppercase opacity-90",
            theme.subtitle
          )}
          style={{ transform: "translateZ(20px)" }}
        >
          {it.subtitle}
        </span>
      </div>
    </motion.div>
  );
}

`;

if (!code.includes('function InteractiveMacFolder')) {
  // Inject before default export
  code = code.replace(
    'export default function RecordsArchiveTab',
    componentCode + 'export default function RecordsArchiveTab'
  );
}

// Replace the inline mapping with <InteractiveMacFolder />
const oldMapBlock = `{filteredExplorerItems.map((it, index) => {
                    const theme = FOLDER_COLORS[folderColors[it.key]] || FOLDER_COLORS["yellow"]
                    return (
                      <div
                        key={index}
                        onClick={it.disabled ? undefined : it.onClick}
                        className={\`group relative h-48 w-full min-w-[180px] max-w-[300px] transition-all duration-normal \${ it.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer" }\`}
                        style={{ perspective: "1000px" }}
                      >
                        {/* Paint Palette Color Picker Button */}
                        <div 
                          className="absolute bottom-2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-fast" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 border border-black/10 shadow-xs transition-colors",
                                  theme.isLight ? "text-amber-950/80" : "text-white/80"
                                )}
                                title="Change Folder Color"
                              >
                                <HugeIcon  className="ph-bold ph-palette text-xs" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-36 p-2 rounded-xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl" side="top" align="end">
                              <div className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 px-1 tracking-wider">Folder Color</div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {Object.entries(FOLDER_COLORS).map(([colorKey, colorVal]) => (
                                  <button
                                    key={colorKey}
                                    type="button"
                                    onClick={() => updateFolderColor(it.key, colorKey)}
                                    className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 active:scale-95 transition-transform cursor-pointer flex items-center justify-center"
                                    style={{ backgroundColor: colorVal.frontStart }}
                                    title={colorVal.name}
                                  >
                                    {(folderColors[it.key] === colorKey || (!folderColors[it.key] && colorKey === "yellow")) ? (
                                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                                    ) : null}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* macOS Folder Back Flap (CSS panel matching front dimensions/alignment) */}
                        <div 
                          className="absolute top-[18px] left-0 right-0 bottom-0 rounded-2xl transition-all duration-normal"
                          style={{
                            background: \`linear-gradient(180deg, \${theme.backStart} 0%, \${theme.backEnd} 100%)\`
                          }}
                        >
                          {/* Folder Tab (Attached to top-left of the back flap) */}
                          <div 
                            className="absolute bottom-[calc(100%-1px)] left-[16px] w-20 h-4 rounded-t-[8px] z-0"
                            style={{
                              backgroundColor: theme.backStart
                            }}
                          />
                        </div>

                        {/* Solid Paper Peek Sheets (Apple-like stacking) */}
                        <div className="absolute top-[2px] left-[5%] right-[5%] bottom-[20px] z-10 flex flex-col justify-end transition-all duration-normal group-hover:translate-y-[-12px] group-hover:scale-[1.02]">
                          {/* Back sheet */}
                          <div className="absolute bottom-0 left-[6%] right-[6%] h-[56px] bg-white/70 rounded-t-md shadow-[0_-1px_3px_rgba(0,0,0,0.05)] border-t border-x border-gray-200/20 transform -rotate-3 origin-bottom transition-all duration-normal group-hover:rotate-[-6deg]" />
                          
                          {/* Middle sheet */}
                          <div className="absolute bottom-0 left-[3%] right-[3%] h-[60px] bg-white/85 rounded-t-md shadow-[0_-1px_4px_rgba(0,0,0,0.05)] border-t border-x border-gray-200/30 transform rotate-2 origin-bottom transition-all duration-normal group-hover:rotate-[4deg]" />
                          
                          {/* Front sheet with mock content lines */}
                          <div className="absolute bottom-0 left-0 right-0 h-[64px] bg-white rounded-t-md shadow-[0_-2px_6px_rgba(0,0,0,0.08)] border-t border-x border-gray-200 p-3 flex flex-col gap-1.5 transition-all duration-normal">
                            {/* Mock lines */}
                            <div className="h-1.5 w-1/3 bg-gray-300/60 rounded-full" />
                            <div className="h-1 w-full bg-gray-200/50 rounded-full" />
                            <div className="h-1 w-5/6 bg-gray-200/50 rounded-full" />
                          </div>
                        </div>

                        {/* macOS Folder Front Body with 3D Opening Tilt */}
                        <div 
                          className="absolute top-[28px] right-0 bottom-0 left-0 z-20 flex flex-col items-center justify-center rounded-2xl p-4 transition-all duration-normal origin-bottom [transform-style:preserve-3d] group-hover:[transform:rotateX(-14deg)_translateY(2px)]"
                          style={{
                            background: \`linear-gradient(180deg, \${theme.frontStart} 0%, \${theme.frontEnd} 100%)\`
                          }}
                        >
                          {/* Glossy highlight/gradient overlay */}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none z-25" />
                          
                          <h3 className={cn(
                            "w-full truncate px-1 text-center text-3xl font-black sm:text-4xl z-30 tracking-tight",
                            theme.title
                          )}>
                            {it.title}
                          </h3>
                          <span className={cn(
                            "mt-1 text-xs font-bold tracking-widest z-30 uppercase opacity-90",
                            theme.subtitle
                          )}>
                            {it.subtitle}
                          </span>
                        </div>
                      </div>
                    )
                  })}`;

const newMapBlock = `{filteredExplorerItems.map((it, index) => {
                    const theme = FOLDER_COLORS[folderColors[it.key]] || FOLDER_COLORS["yellow"]
                    return (
                      <InteractiveMacFolder 
                        key={index} 
                        it={it} 
                        theme={theme} 
                        updateFolderColor={updateFolderColor}
                        folderColors={folderColors}
                      />
                    )
                  })}`;

code = code.replace(oldMapBlock, newMapBlock);

fs.writeFileSync('next-app/src/components/staff/RecordsArchiveTab.js', code);
console.log('Done!');
