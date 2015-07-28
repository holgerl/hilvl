# The hilvl programming language

Hilvl is a programming language that is versatile but with a very small syntax.

There are only five reserved keywords. The rest is system or user defined services and actions.

`#` `whitespace` `(` `)` `//`

The actions of a service can be directly exposed as a webservice. This means that (virtual and real) web servers are the fundamental building blocks of a hilvl program.

The name hilvl reflects how this a higher level of abstraction than objects and functions.

## Example of hilvl
		
	# new foo = 42
	# new bar = (2 + 40)
		
	# . foo == (# . bar) then
		# set foo = 0
		
	# new myArray = 
		1
		2
		3
		
	# . myArray loop
		# set foo = (# . foo + (# . element))
		
	# . foo // The returned value is: 6

## How to run hilvl

To run a file with hilvl code: `node hl.js myFile.hl`
	
To run all tests: `node hl-tests.js`

To run HiTTP web framework: `node HiTTP.js example-webapp.hl`
	
## Structure of the hilvl language

### Service, action and argument

TODO

### Intendation, arrays and evaluation

TODO

### Variables and scope

TODO

## Advanced examples of hilvl

#### Scope and higher-order programming

	# new foo = 10 // Variable in outer scope

	# new MyService # 
		# new myAction :
			# set foo = 42 // Variable in inner scope
			# new myFunction = (#.argument)
			# myFunction null // Invoking the argument as an action
			
	# new bar = 
		MyService myAction (#.foo + 2) // Argument is evaluated before action is invocated
		MyService myAction // Argument is evaluated on demand by the myAction implementation
			#.foo + 2
		MyService myAction 
			# set foo = 50 // The inner scope is active during on demand evaluation
			#.foo + 2
			
	/*result
	[12, 44, 52]
	*/
	
#### Fluent programming

	# new Please # 
		# new add :
			# new arg1 = (#.argument)
			#.Please // Returning the service itself
		# new and :
			# new arg2 = (#.argument)
			#.Please // Returning the service itself
		# new andThen :
			#.arg1 + (#.arg2) + (#.argument)
			
	Please add 42 and 50 andThen 100
		
	/*result
	192
	*/