# The hilvl programming language

Hilvl is a programming language that is versatile but with a very small syntax.

There are only six symbols. The rest is system or user defined services and actions.

`#` `"` `whitespace` `(` `)` `//`

The actions of a service can be directly exposed as a webservice. This means that (virtual and real) web servers are the fundamental building blocks of a hilvl program.

The name hilvl reflects how this is a higher level of abstraction than objects and functions.

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

All statements in hilvl are invocations of single argument actions that are part of some service:

	Service action argument

For instance:

	TextUtil makeUppercase "hello"
	ScoreKeeper add 10

The magic happens when an action returns another service that can be called in a chain:

	Service action argument anotherAction anotherArgument

For instance:

	SandwichMaker makeNewSandwhich "cheese" addSome "tomato"

Services can of course be arguments to other actions:

	Chooser makeChoice (StrategyMaker mustBeLargerThan 10)

Everything is a service in hilvl, even string and numbers. And action names can be anything. This means that even this is an ordinary action invocation:

	2 + 40

Here, `2` is the service, `+` is the action and `40` is the argument

Here is another example:

	# set myVariableName = 42

Here, `#` is the service, `set` is the action and `myVariableName` is the argument. This returns a new service which has an action `=` that is called with `42` as an argument.

#### Importance of parantheses

There is no precedence in hilvl. This means that parantheses may be necessary to group arguments correctly:

	# set myVar = 2 + 40     // This fails during runtime!

This is wrong because the action named `=` will take `2` as its argument, but the resulting service will not have a method named `+`. The correct way is to group `2 + 40` to a single argument to the `=` action:

	# set myVar = (2 + 40)

#### Intendation and arrays

Every action takes only 1 argument, but that argument can be an array. Whitespace intendation is used to declare an array:

	MyUtil sort
		4
		2
		9
		3
		
Here, the argument is the array [4,2,9,3].

Why use whitespace for this you ask? The point is that if you make an array of *statements*, then you have a block of code. All code in hilvl are arrays of statements that can be passed around and invoked by other code.

### Syntactic sugar

To make code more readable, some shortcuts are supported in the syntax:

**Dot**

`foo.bar` is the same as  `foo . bar`

This means that the `.` is an action name even though there is no space around it.

**Block comment**

	/*
	This is
	a block
	comment
	*/

is the same as

	// This is
	// a block
	// comment
	
**Comma arrays**

	Foo bar
		1, 2, 3

is the same as

	Foo bar
		1
		2
		3
		
This is to make literal arrays of numbers and strings more consise.

### Variables, scope and evaluation

TODO (This is where the real magic happens)

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