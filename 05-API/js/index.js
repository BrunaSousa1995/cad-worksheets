var app = (function($) {
    'use strict';
 
    // ---------------------------------------------------------------
    // Exercício 2 - Home Sweet Home
    // ---------------------------------------------------------------
 
    // ---------------------------------------------------------------
    // Persistência (Worksheet 05)
    //  b) sessionStorage -> os dados duram apenas enquanto o separador
    //     estiver aberto
    //  d) localStorage   -> os dados persistem mesmo depois de fechar
    //     o browser
    // Para voltar à alínea b), basta trocar para: var storage = sessionStorage;
    // ---------------------------------------------------------------
    var storage = sessionStorage;
 
    // Guarda { value, time } para o botão indicado (objeto -> JSON string)
    function saveState(id, value) {
        var state = { value: value, time: new Date().toISOString() };
        storage.setItem(id, JSON.stringify(state));
        return state;
    }
 
    // Lê o estado guardado (JSON string -> objeto) ou devolve null
    function loadState(id) {
        var data = storage.getItem(id);
 
        if (data === null) {
            return null;
        }
 
        try {
            return JSON.parse(data);
        } catch (e) {
            return null;
        }
    }
 
    // Classes Font Awesome para cada estado (ícone + cor)
    var LIGHT_ON  = 'fa-solid fa-lightbulb text-warning';
    var LIGHT_OFF = 'fa-regular fa-lightbulb text-secondary';
    var MUSIC_ON  = 'fa-solid fa-music text-primary';
    var MUSIC_OFF = 'fa-solid fa-volume-xmark text-danger';
 
    // Cada dispositivo: id do botão (checkbox), id do ícone e classes de cada estado
    var devices = [
        { buttonId: 'kitchenLightBtn',       iconId: 'kitchenLightIcon',       on: LIGHT_ON, off: LIGHT_OFF },
        { buttonId: 'livingCeilingLightBtn', iconId: 'livingCeilingLightIcon', on: LIGHT_ON, off: LIGHT_OFF },
        { buttonId: 'livingAmbientLightBtn', iconId: 'livingAmbientLightIcon', on: LIGHT_ON, off: LIGHT_OFF },
        { buttonId: 'livingMusicBtn',        iconId: 'livingMusicIcon',        on: MUSIC_ON, off: MUSIC_OFF }
    ];
 
    // Atualiza o ícone/cor de acordo com o estado do botão
    function updateDevice(device) {
        var $button = $('#' + device.buttonId);
        var $icon = $('#' + device.iconId);
 
        if ($button.length === 0 || $icon.length === 0) {
            return;
        }
 
        // O Font Awesome (kit JS) troca cada <i> por um <svg>, por isso o id está
        // num <span> e recriamos o <i> sempre que o estado muda.
        var classes = $button.prop('checked') ? device.on : device.off;
        $icon.html('<i class="' + classes + '"></i>');
    }
 
    // Converte uma data ISO para "HH:MM:SS AAAA-MM-DD"
    function formatToggleTime(isoString) {
        var d = new Date(isoString);
 
        return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
            ' ' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
 
    // Mostra a hora do último toggle no "sensor-time" do próprio dispositivo
    function showToggleTime(device, isoString) {
        $('#' + device.buttonId)
            .closest('.sensor')
            .find('.sensor-time')
            .text(formatToggleTime(isoString));
    }
 
    // Repõe o estado guardado, liga o evento e sincroniza o ícone
    function setupDevice(device) {
        var $button = $('#' + device.buttonId);
 
        if ($button.length === 0) {
            return;
        }
 
        // 1. Repor o estado guardado (se existir)
        var saved = loadState(device.buttonId);
        if (saved !== null) {
            $button.prop('checked', saved.value === true);
            showToggleTime(device, saved.time);
        }
 
        // 2. Guardar o novo estado sempre que o botão muda
        $button.on('change', function() {
            var state = saveState(device.buttonId, this.checked);
            showToggleTime(device, state.time);
            updateDevice(device);
        });
 
        updateDevice(device);
    }
 
    // ---------------------------------------------------------------
    // Temperaturas: valor aleatório entre 10 e 30 ºC, de 5 em 5 segundos
    // ---------------------------------------------------------------
    var temperatureIds = ['kitchenTemperature', 'livingRoomTemperature'];
 
    function randomTemperature() {
        return (10 + Math.random() * 20).toFixed(1);
    }
 
    function updateTemperatures() {
        $.each(temperatureIds, function(index, id) {
            $('#' + id).text(randomTemperature() + ' °C');
        });
    }
 
    // ---------------------------------------------------------------
    // Relógio: data atualizada ao carregar, hora atualizada a cada segundo
    // ---------------------------------------------------------------
    function pad(number) {
        return number < 10 ? '0' + number : String(number);
    }
 
    function updateDate() {
        var now = new Date();
 
        $('#dateValue').text(
            now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
        );
    }
 
    function updateTime() {
        var now = new Date();
 
        $('#timeValue').text(
            pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds())
        );
    }
 
    // ---------------------------------------------------------------
    // Meteorologia (OpenWeatherMap)
    // ---------------------------------------------------------------
    var API_KEY = 'b30d8b26fd9c42564fd5ed6938c39e48';
    var API_URL = 'https://api.openweathermap.org/data/2.5/weather';
    var lastFetch = null;            // Date do último pedido com sucesso
 
    // Converte timestamp Unix (segundos) para "7h46"
    function formatHour(unixSeconds) {
        var date = new Date(unixSeconds * 1000);
        return date.getHours() + 'h' + pad(date.getMinutes());
    }
 
    function plural(value, unit) {
        return value + ' ' + unit + (value === 1 ? '' : 's') + ' ago';
    }
 
    // < 1 min: segundos | < 1 h: minutos | resto: horas
    function updateLastFetch() {
        if (lastFetch === null) {
            return;
        }
 
        var seconds = Math.floor((Date.now() - lastFetch.getTime()) / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);
        var text;
 
        if (seconds < 60) {
            text = plural(seconds, 'second');
        } else if (minutes < 60) {
            text = plural(minutes, 'minute');
        } else {
            text = plural(hours, 'hour');
        }
 
        $('#weatherUpdate').text(text);
    }
 
    function showWeather(data) {
        $('#temperatureValue').text(data.main.temp + ' °C');
        $('#maxTemperatureValue').text(data.main.temp_max + ' °C');
        $('#minTemperatureValue').text(data.main.temp_min + ' °C');
        $('#humidityValue').text(data.main.humidity + '%');
        $('#sunriseTimeValue').text(formatHour(data.sys.sunrise));
        $('#sunsetTimeValue').text(formatHour(data.sys.sunset));
        $('#weatherError').text('');
 
        lastFetch = new Date();
        updateLastFetch();
    }
 
    function getWeather(city) {
        $.getJSON(API_URL, { units: 'metric', q: city, appid: API_KEY })
            .done(showWeather)
            .fail(function() {
                $('#weatherError').text('Não foi possível obter a meteorologia para "' + city + '".');
            });
    }
 
    function setupWeather() {
        $('#getWeatherBtn').on('click', function() {
            getWeather($('#cityInput').val().trim());
        });
 
        $('#cityInput').on('keydown', function(event) {
            if (event.key === 'Enter') {
                getWeather($(this).val().trim());
            }
        });
 
        getWeather($('#cityInput').val().trim());
        setInterval(updateLastFetch, 1000);
    }
 
    // ---------------------------------------------------------------
    // Arranque
    // ---------------------------------------------------------------
    function init() {
        $.each(devices, function(index, device) {
            setupDevice(device);
        });
 
        updateTemperatures();
        setInterval(updateTemperatures, 5000);
 
        updateDate();
        updateTime();
        setInterval(updateTime, 1000);
 
        setupWeather();
    }
 
    $(document).ready(init);
 
})(jQuery);