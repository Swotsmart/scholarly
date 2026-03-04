# Scholarly E2E Testing — Package.json Script Additions
#
# Add these to packages/web/package.json under "scripts":
#
#   "test:e2e": "playwright test",
#   "test:e2e:ui": "playwright test --ui",
#   "test:e2e:auth": "playwright test --project=auth",
#   "test:e2e:teacher": "playwright test --project=teacher",
#   "test:e2e:parent": "playwright test --project=parent",
#   "test:e2e:admin": "playwright test --project=admin",
#   "test:e2e:tutor": "playwright test --project=tutor",
#   "test:e2e:common": "playwright test --project=common",
#   "test:e2e:storybook": "playwright test --project=storybook",
#   "test:e2e:golden-path": "playwright test --project=golden-path",
#   "test:e2e:homeschool": "playwright test --project=homeschool",
#   "test:e2e:hosting": "playwright test --project=hosting",
#   "test:e2e:notifications": "playwright test --project=notifications",
#   "test:e2e:mobile": "playwright test --project=mobile",
#   "test:e2e:report": "playwright show-report",
#   "test:e2e:codegen": "playwright codegen http://localhost:3000"
#
# Add to devDependencies:
#
#   "@playwright/test": "^1.51.0"
#
# Then run:
#
#   pnpm exec playwright install
#
# This installs Chromium, Firefox, and WebKit browsers.
