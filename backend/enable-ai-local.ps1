$ErrorActionPreference = 'Stop'
$previousKey = $env:OPENAI_API_KEY
$privateKey = Read-Host 'Enter your OpenAI API key (hidden)' -AsSecureString
$keyPointer = [IntPtr]::Zero
try {
    $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($privateKey)
    $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    & (Join-Path $PSScriptRoot 'start-local.ps1')
} finally {
    if ($keyPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
    $privateKey.Dispose()
    $env:OPENAI_API_KEY = $previousKey
}
