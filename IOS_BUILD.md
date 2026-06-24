# iPhone / iOS build guide

## Что уже подготовлено

Проект подготовлен под iPhone в трех вариантах:
- как web app для Safari / Add to Home Screen
- как база для упаковки в `.ipa` через Capacitor
- как облачная iOS-сборка через Codemagic

## Важно честно

Собрать настоящий `.ipa` без Mac можно через Codemagic, но вам все равно нужны:
- Apple Developer account
- App Store Connect API key
- доступ к сертификатам и provisioning profile

## Вариант 1. Установить как web app на iPhone

1. Откройте опубликованный сайт в Safari на iPhone
2. Нажмите Share
3. Выберите `Add to Home Screen`
4. MaxyMessenger появится на домашнем экране как отдельное приложение

## Вариант 2. Сделать `.ipa` через Codemagic без Mac

### Что уже добавлено в проект

- `codemagic.yaml`
- `capacitor.config.json`
- зависимости Capacitor в `package.json`

### Что сделать в Codemagic

1. Залейте проект в GitHub / GitLab / Bitbucket
2. Подключите репозиторий в Codemagic
3. В Codemagic создайте App Store Connect integration
   Название в проекте сейчас ожидается такое:
   `codemagic-app-store-connect`
4. В Apple Developer создайте App ID с bundle id:
   `com.maxymessenger.app`
5. Запустите workflow:
   `ios-ipa`

### Что делает workflow

- ставит npm-зависимости
- добавляет и синхронизирует Capacitor iOS проект
- подтягивает signing files через App Store Connect
- делает signed `.ipa`
- может отправить сборку в TestFlight

## Важно

Перед первым билдом в Codemagic замените email получателя в `codemagic.yaml`:
- `you@example.com`

Если захотите другой bundle id, поменяйте его в:
- `capacitor.config.json`
- `codemagic.yaml`

## Вариант 3. Сделать `.ipa` через Capacitor на Mac

Если позже появится Mac:

```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```
