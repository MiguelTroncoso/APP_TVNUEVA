# Registro de notas

# Diccionario: cada nombre apunta a una lista de sus notas
alumnos = {}

opcion = 0

while opcion != 4:
    print()
    print("===== MENÚ =====")
    print("1.- Ingresar alumno")
    print("2.- Ingresar notas")
    print("3.- Promediar")
    print("4.- Salir")
    opcion = int(input("Elige una opción: "))

    if opcion == 1:
        nombre = input("Nombre del alumno: ")
        alumnos[nombre] = []
        print("Alumno agregado.")

    elif opcion == 2:
        nombre = input("¿A qué alumno le agregas notas?: ")
        if nombre in alumnos:
            cantidad = int(input("¿Cuántas notas vas a ingresar?: "))
            for i in range(cantidad):
                nota = float(input("Nota " + str(i + 1) + ": "))
                alumnos[nombre].append(nota)
            print("Notas guardadas.")
        else:
            print("Ese alumno no existe.")

    elif opcion == 3:
        for nombre in alumnos:
            notas = alumnos[nombre]
            if len(notas) > 0:
                suma = 0
                for n in notas:
                    suma = suma + n
                promedio = suma / len(notas)

                if promedio >= 4.0:
                    estado = "APROBÓ"
                else:
                    estado = "REPROBÓ"
                print(nombre, "- Promedio:", round(promedio, 1), "-", estado)
            else:
                print(nombre, "- Sin notas ingresadas")

    elif opcion == 4:
        print("Saliendo...")

    else:
        print("Opción no válida.")