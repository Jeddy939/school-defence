param(
    [string]$SourceDocx = 'C:\Users\jmbow1\AppData\Local\Temp\class 1a contract 2025-26 DWG ADDS (2).docx',
    [string]$OutputDir = 'D:\jmbow1\Desktop\game projects\schoolyard defence\generated'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ZipEntryText {
    param(
        [System.IO.Compression.ZipArchive]$Zip,
        [string]$EntryName
    )

    $entry = $Zip.GetEntry($EntryName)
    if (-not $entry) {
        throw "Missing zip entry: $EntryName"
    }

    $reader = [System.IO.StreamReader]::new($entry.Open())
    try {
        return $reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
    }
}

function Replace-FieldBlock {
    param(
        [string]$XmlText,
        [string]$FieldName,
        [scriptblock]$Builder
    )

    $nameMarker = '<w:name w:val="' + $FieldName + '"/>'
    $nameIndex = $XmlText.IndexOf($nameMarker)
    if ($nameIndex -lt 0) {
        throw "Could not find field name for $FieldName"
    }

    $runStartWithAttrs = $XmlText.LastIndexOf('<w:r ', $nameIndex)
    $runStartBare = $XmlText.LastIndexOf('<w:r>', $nameIndex)
    $startIndex = [Math]::Max($runStartWithAttrs, $runStartBare)
    if ($startIndex -lt 0) {
        throw "Could not find run start for $FieldName"
    }

    $bookmarkMarker = '<w:bookmarkStart '
    $bookmarkIndex = $XmlText.IndexOf($bookmarkMarker, $nameIndex)
    if ($bookmarkIndex -lt 0) {
        throw "Could not find bookmark start for $FieldName"
    }

    $bookmarkSlice = $XmlText.Substring($bookmarkIndex, [Math]::Min(300, $XmlText.Length - $bookmarkIndex))
    $idMatch = [regex]::Match($bookmarkSlice, 'w:id="(?<id>\d+)" w:name="' + [regex]::Escape($FieldName) + '"')
    if (-not $idMatch.Success) {
        throw "Could not find bookmark id for $FieldName"
    }

    $bookmarkId = $idMatch.Groups['id'].Value
    $endMarker = '<w:bookmarkEnd w:id="' + $bookmarkId + '"/>'
    $endIndex = $XmlText.IndexOf($endMarker, $bookmarkIndex)
    if ($endIndex -lt 0) {
        throw "Could not find bookmark end for $FieldName"
    }

    $replacement = & $Builder $bookmarkId
    $prefix = $XmlText.Substring(0, $startIndex)
    $suffix = $XmlText.Substring($endIndex + $endMarker.Length)
    return $prefix + $replacement + $suffix
}

function Build-TextFieldWithDollar {
    param(
        [string]$Id,
        [string]$Name,
        [string]$ResultText
    )

    return @"
<w:r><w:t>$</w:t></w:r><w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:name w:val="$Name"/><w:enabled/><w:calcOnExit w:val="1"/><w:textInput/></w:ffData></w:fldChar></w:r><w:bookmarkStart w:id="$Id" w:name="$Name"/><w:r><w:instrText xml:space="preserve"> FORMTEXT </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>$ResultText</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:bookmarkEnd w:id="$Id"/>
"@
}

function Build-FormulaField {
    param(
        [string]$Id,
        [string]$Name,
        [string]$FormulaCode,
        [string]$DisplayedResult
    )

    return @"
<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:bookmarkStart w:id="$Id" w:name="$Name"/><w:r><w:instrText xml:space="preserve"> $FormulaCode </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>$DisplayedResult</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:bookmarkEnd w:id="$Id"/>
"@
}

function Ensure-Directory {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Copy-ZipWithReplacements {
    param(
        [string]$SourcePath,
        [string]$TargetPath,
        [hashtable]$TextReplacements
    )

    if (Test-Path -LiteralPath $TargetPath) {
        Remove-Item -LiteralPath $TargetPath -Force
    }

    $sourceZip = [System.IO.Compression.ZipFile]::OpenRead($SourcePath)
    try {
        $targetZip = [System.IO.Compression.ZipFile]::Open($TargetPath, [System.IO.Compression.ZipArchiveMode]::Create)
        try {
            foreach ($entry in $sourceZip.Entries) {
                $newEntry = $targetZip.CreateEntry($entry.FullName, [System.IO.Compression.CompressionLevel]::Optimal)
                $targetStream = $newEntry.Open()
                try {
                    if ($TextReplacements.ContainsKey($entry.FullName)) {
                        $writer = [System.IO.StreamWriter]::new($targetStream, [System.Text.UTF8Encoding]::new($false))
                        try {
                            $writer.Write($TextReplacements[$entry.FullName])
                        }
                        finally {
                            $writer.Dispose()
                        }
                    }
                    else {
                        $sourceStream = $entry.Open()
                        try {
                            $sourceStream.CopyTo($targetStream)
                        }
                        finally {
                            $sourceStream.Dispose()
                        }
                    }
                }
                finally {
                    $targetStream.Dispose()
                }
            }
        }
        finally {
            $targetZip.Dispose()
        }
    }
    finally {
        $sourceZip.Dispose()
    }
}

if (-not (Test-Path -LiteralPath $SourceDocx)) {
    throw "Source file not found: $SourceDocx"
}

Ensure-Directory -Path $OutputDir

$sourceZip = [System.IO.Compression.ZipFile]::OpenRead($SourceDocx)
try {
    $documentXml = Get-ZipEntryText -Zip $sourceZip -EntryName 'word/document.xml'
    $contentTypesXml = Get-ZipEntryText -Zip $sourceZip -EntryName '[Content_Types].xml'
    $settingsXml = Get-ZipEntryText -Zip $sourceZip -EntryName 'word/settings.xml'
}
finally {
    $sourceZip.Dispose()
}

# Recalculate after leaving any form field in the protected form.
$documentXml = $documentXml -replace '<w:calcOnExit w:val="0"/>', '<w:calcOnExit w:val="1"/>'

# Keep the prefilled fee inputs numeric so Word formulas can sum them.
$documentXml = Replace-FieldBlock -XmlText $documentXml -FieldName 'Text66' -Builder {
    param($id)
    Build-TextFieldWithDollar -Id $id -Name 'Text66' -ResultText '1900'
}

$documentXml = Replace-FieldBlock -XmlText $documentXml -FieldName 'Text22' -Builder {
    param($id)
    Build-TextFieldWithDollar -Id $id -Name 'Text22' -ResultText '135'
}

# Replace summary text fields with live Word formula fields.
$documentXml = Replace-FieldBlock -XmlText $documentXml -FieldName 'Text20' -Builder {
    param($id)
    Build-FormulaField -Id $id -Name 'Text20' -FormulaCode '=SUM(ABOVE) * 0.1 \# "#,##0.##"' -DisplayedResult '198'
}

$documentXml = Replace-FieldBlock -XmlText $documentXml -FieldName 'Text21' -Builder {
    param($id)
    Build-FormulaField -Id $id -Name 'Text21' -FormulaCode '=SUM(ABOVE) \# "#,##0.##"' -DisplayedResult '2178'
}

$documentXml = Replace-FieldBlock -XmlText $documentXml -FieldName 'Text63' -Builder {
    param($id)
    Build-FormulaField -Id $id -Name 'Text63' -FormulaCode '=SUM(ABOVE) \# "#,##0.##"' -DisplayedResult '0'
}

$documentXml = Replace-FieldBlock -XmlText $documentXml -FieldName 'Text42' -Builder {
    param($id)
    Build-FormulaField -Id $id -Name 'Text42' -FormulaCode '=SUM(ABOVE) + Text63 \# "#,##0.##"' -DisplayedResult '135'
}

$documentXml = Replace-FieldBlock -XmlText $documentXml -FieldName 'Text43' -Builder {
    param($id)
    Build-FormulaField -Id $id -Name 'Text43' -FormulaCode '=Text21 + Text42 \# "#,##0.##"' -DisplayedResult '2,313'
}

if ($settingsXml -notmatch '<w:updateFields\b') {
    $settingsXml = $settingsXml -replace '</w:settings>$', '<w:updateFields w:val="true"/></w:settings>'
}

$docxOutput = Join-Path $OutputDir 'coastal_quote_form_auto_calc_working.docx'
$docmOutput = Join-Path $OutputDir 'coastal_quote_form_auto_calc_working.docm'

Copy-ZipWithReplacements -SourcePath $SourceDocx -TargetPath $docxOutput -TextReplacements @{
    'word/document.xml' = $documentXml
    'word/settings.xml' = $settingsXml
}

$macroContentTypesXml = $contentTypesXml -replace 'application/vnd\.openxmlformats-officedocument\.wordprocessingml\.document\.main\+xml', 'application/vnd.ms-word.document.macroEnabled.main+xml'

Copy-ZipWithReplacements -SourcePath $SourceDocx -TargetPath $docmOutput -TextReplacements @{
    'word/document.xml'   = $documentXml
    'word/settings.xml'   = $settingsXml
    '[Content_Types].xml' = $macroContentTypesXml
}

Write-Output "Created:"
Write-Output $docxOutput
Write-Output $docmOutput
