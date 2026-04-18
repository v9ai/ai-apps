# Joc de pinball pentru Bogdan.
# Press 1 pe butonul verde -> motorul porneste si tot merge.
# Press 2 pe butonul verde -> motorul se opreste.
# Ca sa iesi din program: tine butonul apasat 2s (hub-ul se stinge).

from pybricks.hubs import CityHub as Hub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Color, Button
from pybricks.tools import wait

hub = Hub()

# Pe CityHub (1 buton) butonul verde opreste programul by default.
# Il dezactivam ca sa fie folosit ca trigger on/off pentru motor.
hub.system.set_stop_button(None)

# bricks:motor=spike-large
launcher = Motor(Port.A)

LAUNCH_SPEED = 500

hub.light.on(Color.WHITE)
motor_running = False

while True:
    if Button.CENTER in hub.buttons.pressed():
        if motor_running:
            launcher.stop()
            motor_running = False
            hub.light.on(Color.WHITE)
        else:
            launcher.run(LAUNCH_SPEED)
            motor_running = True
            hub.light.on(Color.RED)

        # asteapta ridicarea degetului (debounce)
        while Button.CENTER in hub.buttons.pressed():
            wait(20)
        wait(150)

    wait(30)
