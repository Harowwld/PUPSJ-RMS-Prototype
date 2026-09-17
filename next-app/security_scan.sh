echo "=== 1. Hide API keys ==="
grep -rnw --exclude-dir=node_modules --exclude-dir=.git "NEXT_PUBLIC_.*_KEY\|API_KEY\|SECRET" . || echo "None found"

echo "=== 5. Encrypt / Hash ==="
grep -rnw --exclude-dir=node_modules --exclude-dir=.git "crypto\|bcrypt\|hash" . | head -n 5

echo "=== 9. Secure cookies ==="
grep -rnw --exclude-dir=node_modules --exclude-dir=.git "cookies().set" . | head -n 5

echo "=== 12. Bot protection ==="
grep -rnw --exclude-dir=node_modules --exclude-dir=.git "captcha\|turnstile" . || echo "None found"

echo "=== 15. Escape user content ==="
grep -rnw --exclude-dir=node_modules --exclude-dir=.git "dangerouslySetInnerHTML" . | wc -l

echo "=== 16. Restrict file uploads ==="
grep -rnw --exclude-dir=node_modules --exclude-dir=.git "multer\|upload\|formidable" . | head -n 5

echo "=== 17. Trim API responses (SELECT *) ==="
grep -rnw --exclude-dir=node_modules --exclude-dir=.git "SELECT \*" . | wc -l

echo "=== 18. Security headers ==="
grep -rnw --exclude-dir=node_modules --exclude-dir=.git "addSecurityHeaders\|helmet" . | head -n 5
