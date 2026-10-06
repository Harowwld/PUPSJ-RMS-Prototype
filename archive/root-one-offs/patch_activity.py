import re

with open('next-app/src/app/account/activity/page.js', 'r') as f:
    content = f.read()

old_button = """className={cn("mx-auto flex h-7 w-7 items-center justify-center bg-transparent border-none text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 cursor-pointer transition-transform duration-fast", isExpanded ? "rotate-180" : "rotate-0")}
          >
            <HugeIcon  className="ti ti-chevron-down text-[14px]"></HugeIcon>
          </button>"""

new_button = """className="mx-auto flex h-7 w-7 items-center justify-center bg-transparent border-none text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 cursor-pointer transition-colors duration-fast"
          >
            {isExpanded ? (
              <HugeIcon className="ph-bold ph-minus text-[14px]" />
            ) : (
              <HugeIcon className="ph-bold ph-plus text-[14px]" />
            )}
          </button>"""

if old_button in content:
    content = content.replace(old_button, new_button)
    with open('next-app/src/app/account/activity/page.js', 'w') as f:
        f.write(content)
    print("Replaced chevron with +/-")
else:
    print("Could not find old_button")
