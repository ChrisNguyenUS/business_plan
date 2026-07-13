import re

file_path = 'apps/website/src/app/[locale]/n400app/(auth)/login/login.module.css'
with open(file_path, 'r') as f:
    css = f.read()

# 1. Adjust leftPanel and rightPanel widths
css = re.sub(
    r'@media \(min-width: 1024px\) \{\n  \.leftPanel \{\n    display: flex;\n    flex: 0 0 48%;\n  \}\n\}',
    '@media (min-width: 1024px) {\\n  .leftPanel {\\n    display: flex;\\n    flex: 0 0 54%;\\n  }\\n}',
    css
)

css = re.sub(
    r'@media \(min-width: 1280px\) \{\n  \.leftPanel \{\n    flex-basis: 46%;\n  \}\n\}',
    '@media (min-width: 1280px) {\\n  .leftPanel {\\n    flex-basis: 56%;\\n  }\\n}',
    css
)

css = re.sub(
    r'@media \(min-width: 1024px\) \{\n  \.rightPanel \{\n    flex: 0 0 52%;',
    '@media (min-width: 1024px) {\\n  .rightPanel {\\n    flex: 0 0 46%;',
    css
)

css = re.sub(
    r'@media \(min-width: 1280px\) \{\n  \.rightPanel \{\n    flex-basis: 55%;\n  \}\n\}',
    '@media (min-width: 1280px) {\\n  .rightPanel {\\n    flex-basis: 44%;\\n  }\\n}',
    css
)

# 2. Adjust loginCard width
css = re.sub(
    r'@media \(min-width: 640px\) \{\n  \.loginCard \{\n    border-radius: 40px;\n    padding: 44px 40px;\n    max-width: 480px;\n  \}\n\}',
    '@media (min-width: 640px) {\\n  .loginCard {\\n    border-radius: 40px;\\n    padding: 44px 40px;\\n    max-width: 440px;\\n  }\\n}',
    css
)

css = re.sub(
    r'@media \(min-width: 1024px\) \{\n  \.loginCard \{\n    max-width: clamp\(460px, 42vw, 640px\);',
    '@media (min-width: 1024px) {\\n  .loginCard {\\n    max-width: clamp(380px, 35vw, 480px);',
    css
)

# 3. Add padding-left to leftContent to push it right, away from statue
css = re.sub(
    r'\.leftContent \{\n  position: relative;\n  z-index: 2;\n  padding: clamp\(40px, 6vh, 72px\) 0 0;\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  justify-content: flex-start;\n  min-height: 0;\n\}',
    '.leftContent {\\n  position: relative;\\n  z-index: 2;\\n  padding: clamp(40px, 6vh, 72px) 0 0 clamp(16px, 4vw, 64px);\\n  flex: 1;\\n  display: flex;\\n  flex-direction: column;\\n  align-items: flex-start;\\n  justify-content: flex-start;\\n  min-height: 0;\\n}',
    css
)

# 4. Add social proof styles
social_proof_css = '''
/* ─── Social Proof ─── */
.socialProof {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(22, 163, 148, 0.04);
  border: 1px solid rgba(22, 163, 148, 0.12);
  border-radius: 24px;
  padding: 16px 20px;
  margin-top: 24px;
  max-width: 500px;
}

.socialProofIconWrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #E5F6F4;
  flex-shrink: 0;
}

.socialProofShield {
  color: #16A394;
}

.socialProofContent {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stars {
  display: flex;
  gap: 2px;
}

.socialProofText {
  font-size: 13px;
  color: #1B2430;
  line-height: 1.5;
  margin: 0;
  font-weight: 500;
}

@media (min-height: 900px) {
  .socialProof {
    padding: 20px 24px;
    margin-top: 32px;
  }
  .socialProofText {
    font-size: 14px;
  }
}
'''

if '.socialProof {' not in css:
    css = css.replace('/* ─── Features ─── */', social_proof_css + '\\n/* ─── Features ─── */')

with open(file_path, 'w') as f:
    f.write(css)

