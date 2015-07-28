# The hilvl programming language

## Example of hilvl

	# new myArray = 
		1, 2, 3
		
	# new myValue = 0
		
	#.myArray loop
		# set myValue = (#.myValue + (#.element))
		
	#.myValue

	/*result
	6
	*/

## How to run hilvl

To run a file with hilvl code:
	node hl.js myFile.hl
	
To run all tests:
	node hl-tests.js

To run HiTTP web framework
	node HiTTP.js example-webapp.hl
	
## Structure of the hilvl language

### Service, action and argument

TODO

### Use of intendation

TODO