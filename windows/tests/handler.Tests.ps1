# Pester-тесты для windows/handler.ps1
# Запуск: Invoke-Pester -Path windows/tests/

BeforeAll {
    # Регулярное выражение для проверки схемы (должно совпадать с handler.ps1)
    $script:schemePattern = '^ytdlp://'
}

Describe "Проверка схемы (ytdlp://)" {

    Context "Валидные URL (должны проходить)" {
        It "принимает ytdlp://download?url=..." {
            "ytdlp://download?url=https://youtube.com/watch?v=123" -match $script:schemePattern |
                Should -Be $true
        }
        It "принимает ytdlp:// с минимальным query" {
            "ytdlp://download?url=x" -match $script:schemePattern |
                Should -Be $true
        }
        It "принимает ytdlp:// (только схема)" {
            "ytdlp://" -match $script:schemePattern |
                Should -Be $true
        }
        It "принимает ytdlp://download?url=&f=best" {
            "ytdlp://download?url=https://youtu.be/abc&f=best" -match $script:schemePattern |
                Should -Be $true
        }
    }

    Context "Невалидные URL (должны отклоняться)" {
        It "отклоняет http://" {
            "http://example.com" -match $script:schemePattern |
                Should -Be $false
        }
        It "отклоняет https://" {
            "https://youtube.com" -match $script:schemePattern |
                Should -Be $false
        }
        It "отклоняет пустую строку" {
            "" -match $script:schemePattern |
                Should -Be $false
        }
        It "отклоняет случайный мусор" {
            "garbage input here" -match $script:schemePattern |
                Should -Be $false
        }
        It "отклоняет ytdlp без ://" {
            "ytdlp:something" -match $script:schemePattern |
                Should -Be $false
        }
        It "отклоняет ftp://" {
            "ftp://files.example.com" -match $script:schemePattern |
                Should -Be $false
        }
        It "отклоняет ytdlps:// (неверная схема)" {
            "ytdlps://download" -match $script:schemePattern |
                Should -Be $false
        }
    }
}
