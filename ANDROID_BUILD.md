# Android build guide

## Что уже подготовлено

Проект подготовлен под Android в трех вариантах:
- как обычный мобильный сайт
- как Android APK через Capacitor
- как cloud build через Codemagic

## Самый простой путь без Mac

Для Android это реально проще, чем iOS.
Вы можете собрать:
- `.apk` для прямой установки
- `.aab` для Google Play

## Что уже добавлено в проект

- зависимости `@capacitor/android`
- зависимости `@capacitor/cli`
- команды в `package.json`
- workflow в `codemagic.yaml`

## Вариант 1. Собрать APK через Codemagic

### Workflow для APK

Используйте workflow:
- `android-apk`

Он:
- ставит зависимости вместе с devDependencies
- проверяет наличие Capacitor CLI
- добавляет Android-проект Capacitor
- синхронизирует web-часть
- собирает debug APK

На выходе получите `.apk` в artifacts.

## Если была ошибка `could not determine executable to run`

Она обычно означает, что CI не увидел локальный Capacitor CLI.
В проекте это уже исправлено:
- используется `npm install --include=dev`
- `cap` вызывается напрямую из `./node_modules/.bin/cap`

## Вариант 2. Собрать release AAB/APK через Codemagic

### Workflow для release

Используйте workflow:
- `android-release-aab`

Для него уже предусмотрен Android signing через Codemagic.

Нужно будет добавить keystore в Codemagic под именем:
- `maxymessenger_keystore`
