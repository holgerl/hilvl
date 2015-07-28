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
	This is a
	block comment
	*/

is the same as

	// This is a
	// block comment
	
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

The `Service action argument` structure and indentation based arrays are combined with the scope system for great flexibility for the programmer.

Variables are created, changed and read by referring to the scope service `#`:

	# new myVar // variable "myVar" is declared

	# set myVar = 42 // myVar is given a value

	# new myOtherVar = 10 // the variable creation service also has the = action for more consise code

	# . myVar + (#.myOtherVar) // the values of myVar and myOtherVar are read

	/*result
	52
	*/

All variables are saved in the same scope. But to add a new nested scope, there is an action named `#` on the variable service:

	# new myVar1 = 1
	# new myVar2 = 2

	# new variableWithScope # 
		# new myVar1 = 10
		# set myVar2 = 20
		
	# new myArray = 
		#.myVar1
		#.myVar2

	/*result
	[1, 20]
	*/

Notice how `myVar1` kept its value because the change to `10` was done on a new variable with the same name in the inner scope. `myVar2` on the other hand, was not redeclared in the inner scope, and its value was thus changed to `20`. The scopes are nested, which means that if a variable is used, its value will be searched for upwards in all parent scopes.

After adding a new scope, the `#` action acts exactly like the `=` action, and evalates the argument array. This means that any statements in the argument gets executed. And in the example above, this meant that the variables where changed.

But it is possible to set a value to a variable *without* evaluating the arguments. This is useful when we want to execute a block of code at a later time, or many times over. This is also the key mechanism to structuring code as services and actions.

This is done with the action `:`:

	# new bar = 1
		
	# new foo :
		# set bar = 2
		
	# new barBefore = (#.bar)
		
	# foo null // Invoking the foo action (argument is not used)

	# new barAfter = (#.bar)

	# new results =
		#.barBefore
		#.barAfter

	/*result
	[1, 2]
	*/

If an array of statements is executed, the value of the *last* statement is returned from the action. All hilvl code are arrays of statements, so this is why the last value is always the result in the examples. 

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